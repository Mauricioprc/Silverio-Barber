#!/usr/bin/env node
/**
 * Suíte de teste de integração da Fase 5 (`06-fase5-testes-implantacao.md`) — roda
 * contra um Postgres 18 REAL (não simulado, não teórico), via `embedded-postgres`
 * (baixa e sobe um binário real do Postgres localmente, sem Docker). Aplica os arquivos
 * de migração reais deste repositório (`src/db/migrations/*.sql`), na ordem do
 * `_journal.json`, e reproduz fielmente a lógica dos services (inserir/apagar
 * `ocupacoes_barbeiro` junto com `agendamentos`/`bloqueios_agenda`, rate-limiting de
 * `verificacao.service.ts`, etc.) via SQL puro.
 *
 * Por que SQL puro em vez de importar os services de verdade: `apps/api/src/db/
 * client.ts` usa `@neondatabase/serverless` (`Pool`), que fala o protocolo HTTP/
 * WebSocket específico do proxy da Neon — não o protocolo padrão do Postgres. Contra um
 * Postgres genérico (local ou `embedded-postgres`), esse driver não conecta (confirmado
 * na prática já na Fase 1 — ver README, seção de limitações de teste local). Enquanto
 * isso não mudar, testar a lógica de concorrência/constraints contra um Postgres real
 * exige reimplementar as queries relevantes aqui, mantidas deliberadamente próximas ao
 * código real (mesmos nomes de tabela/coluna, mesma sequência de operações dentro de
 * cada transação) para que uma divergência de comportamento apareça como teste
 * quebrado, não como falso positivo.
 *
 * Uso: `npm run test:integracao` (dentro de `apps/api`). Sai com código 1 se qualquer
 * cenário falhar.
 */
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../src/db/migrations");
// Porta aleatória (não fixa) a cada execução: evita colidir com uma instância anterior
// cujo socket ainda não tenha sido totalmente liberado pelo SO entre uma execução e
// outra (observado na prática neste ambiente — `embedded-postgres`/`pg` às vezes
// demoram a liberar a porta mesmo depois do processo Postgres já ter encerrado).
const PORTA = 40000 + Math.floor(Math.random() * 10000);

const resultados = [];

function registrar(nome, ok, detalhe) {
  resultados.push({ nome, ok, detalhe });
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) process.exitCode = 1;
}

function assert(nome, condicao, detalhe) {
  registrar(nome, Boolean(condicao), detalhe);
}

// ---------------------------------------------------------------------------------
// Helpers que espelham a lógica real (ver cabeçalho do arquivo — por que reimplementada)
// ---------------------------------------------------------------------------------

async function inserirOcupacao(client, { barbeiroId, inicio, fim, tipo, agendamentoId, bloqueioId }) {
  return client.query(
    `INSERT INTO ocupacoes_barbeiro (barbeiro_id, inicio, fim, tipo, agendamento_id, bloqueio_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [barbeiroId, inicio, fim, tipo, agendamentoId ?? null, bloqueioId ?? null]
  );
}

async function removerOcupacaoDeAgendamento(client, agendamentoId) {
  await client.query(`DELETE FROM ocupacoes_barbeiro WHERE agendamento_id = $1`, [agendamentoId]);
}

/** Espelha agendamentos.service.ts:criarAgendamento (parte transacional). */
async function criarAgendamento(client, { id, barbeiroId, servicoId, inicio, fim, valorCentavos }) {
  await client.query("BEGIN");
  try {
    await client.query(
      `INSERT INTO agendamentos (id, barbeiro_id, servico_id, nome_cliente, telefone_cliente, inicio, fim, valor_cobrado_centavos)
       VALUES ($1,$2,$3,'Cliente Teste','11900000000',$4,$5,$6)`,
      [id, barbeiroId, servicoId, inicio, fim, valorCentavos]
    );
    await inserirOcupacao(client, { barbeiroId, inicio, fim, tipo: "agendamento", agendamentoId: id });
    await client.query("COMMIT");
    return { ok: true };
  } catch (erro) {
    await client.query("ROLLBACK");
    return { ok: false, codigo: erro.code, constraint: erro.constraint };
  }
}

/** Espelha agendamentos.service.ts:editarAgendamento (parte transacional relevante). */
async function editarStatusAgendamento(client, { id, barbeiroId, inicio, fim, novoStatus }) {
  await client.query("BEGIN");
  try {
    await client.query(`UPDATE agendamentos SET status = $2 WHERE id = $1`, [id, novoStatus]);
    await removerOcupacaoDeAgendamento(client, id);
    if (novoStatus !== "cancelado") {
      await inserirOcupacao(client, { barbeiroId, inicio, fim, tipo: "agendamento", agendamentoId: id });
    }
    await client.query("COMMIT");
    return { ok: true };
  } catch (erro) {
    await client.query("ROLLBACK");
    return { ok: false, codigo: erro.code, constraint: erro.constraint };
  }
}

async function criarBloqueio(client, { id, barbeiroId, inicio, fim }) {
  await client.query("BEGIN");
  try {
    await client.query(`INSERT INTO bloqueios_agenda (id, barbeiro_id, inicio, fim, motivo) VALUES ($1,$2,$3,$4,'Folga')`, [
      id,
      barbeiroId,
      inicio,
      fim,
    ]);
    await inserirOcupacao(client, { barbeiroId, inicio, fim, tipo: "bloqueio", bloqueioId: id });
    await client.query("COMMIT");
    return { ok: true };
  } catch (erro) {
    await client.query("ROLLBACK");
    return { ok: false, codigo: erro.code, constraint: erro.constraint };
  }
}

// Rate-limit — espelha verificacao.service.ts.
const JANELA_MS = 15 * 60_000;
const MAX_ENVIOS_POR_CLIENTE = 3;
const BACKOFF_SEGUNDOS = [0, 60, 180];

async function tentarEnviarCodigo(client, clienteId, ip, agora) {
  const inicioJanela = new Date(agora.getTime() - JANELA_MS);
  const { rows: envios } = await client.query(
    `SELECT criado_em FROM codigos_verificacao WHERE cliente_id=$1 AND criado_em >= $2 ORDER BY criado_em DESC`,
    [clienteId, inicioJanela]
  );
  if (envios.length >= MAX_ENVIOS_POR_CLIENTE) return { ok: false, motivo: "limite_cliente" };

  const gap = BACKOFF_SEGUNDOS[envios.length] ?? Infinity;
  if (envios.length > 0 && gap > 0) {
    const decorrido = (agora.getTime() - new Date(envios[0].criado_em).getTime()) / 1000;
    if (decorrido < gap) return { ok: false, motivo: "backoff" };
  }

  const codigo = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const codigoHash = crypto.createHash("sha256").update(codigo).digest("base64");
  const expiraEm = new Date(agora.getTime() + 10 * 60_000);
  await client.query(`INSERT INTO codigos_verificacao (cliente_id, ip, codigo_hash, expira_em, criado_em) VALUES ($1,$2,$3,$4,$5)`, [
    clienteId,
    ip,
    codigoHash,
    expiraEm,
    agora,
  ]);
  return { ok: true, codigo };
}

/** Espelha verificacao.service.ts:confirmarCodigoVerificacao, incluindo a aplicação de pendentes. */
async function confirmarCodigo(client, clienteId, codigo, agora) {
  const codigoHash = crypto.createHash("sha256").update(codigo).digest("base64");
  const { rows } = await client.query(
    `SELECT id FROM codigos_verificacao WHERE cliente_id=$1 AND codigo_hash=$2 AND expira_em > $3 AND usado_em IS NULL
     ORDER BY criado_em DESC LIMIT 1`,
    [clienteId, codigoHash, agora]
  );
  if (rows.length === 0) return { ok: false };

  await client.query(`UPDATE codigos_verificacao SET usado_em=$1 WHERE id=$2`, [agora, rows[0].id]);
  const { rows: clienteRows } = await client.query(`SELECT nome_pendente, senha_hash_pendente FROM clientes WHERE id=$1`, [clienteId]);
  const pendente = clienteRows[0];
  await client.query(
    `UPDATE clientes SET telefone_verificado=true,
       nome = COALESCE($2, nome), senha_hash = COALESCE($3, senha_hash),
       nome_pendente = NULL, senha_hash_pendente = NULL
     WHERE id=$1`,
    [clienteId, pendente?.nome_pendente ?? null, pendente?.senha_hash_pendente ?? null]
  );
  return { ok: true };
}

/** Espelha clientes-publico.service.ts:cadastrarClientePublico (caminho "vincula a existente"). */
async function cadastroPublicoVincula(client, telefone, nomeNovo, senhaHashNova) {
  const { rows } = await client.query(`SELECT id FROM clientes WHERE telefone=$1`, [telefone]);
  const existente = rows[0];
  if (!existente) return { vinculado: false };
  await client.query(
    `UPDATE clientes SET nome_pendente=$2, senha_hash_pendente=$3, telefone_verificado=false WHERE id=$1`,
    [existente.id, nomeNovo, senhaHashNova]
  );
  return { vinculado: true, id: existente.id };
}

// ---------------------------------------------------------------------------------

async function aplicarMigracoes(client) {
  const arquivos = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const arquivo of arquivos) {
    await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, arquivo), "utf8"));
  }
  return arquivos;
}

async function seed(client) {
  await client.query(`INSERT INTO usuarios (id, nome, telefone, senha_hash) VALUES (1,'Socio Um','11999990001','hash')`);
  await client.query(`INSERT INTO usuarios (id, nome, telefone, senha_hash) VALUES (2,'Socio Dois','11999990002','hash')`);
  await client.query(`INSERT INTO barbeiros (id, usuario_id, ativo) VALUES (1,1,true)`);
  await client.query(`INSERT INTO barbeiros (id, usuario_id, ativo) VALUES (2,2,true)`);
  await client.query(`INSERT INTO servicos (id, nome, valor_centavos, duracao_minutos) VALUES (1,'Corte',5000,30)`);
  await client.query(`INSERT INTO clientes (id, nome, telefone, senha_hash, telefone_verificado) VALUES (1,'Cliente Balcao','11955554444','hash-original',true)`);
}

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(os.tmpdir(), `silverio-teste-integracao-${Date.now()}`),
    user: "postgres",
    password: "postgres",
    port: PORTA,
    persistent: false,
  });

  console.log("Subindo Postgres real (embedded-postgres)...\n");
  await pg.initialise();
  await pg.start();

  const client = new Client({ host: "127.0.0.1", port: PORTA, user: "postgres", password: "postgres", database: "postgres" });
  await client.connect();

  try {
    const arquivos = await aplicarMigracoes(client);
    console.log(`Migrações aplicadas (${arquivos.length}): ${arquivos.join(", ")}\n`);
    await seed(client);

    console.log("--- Cenário 1: dois POST /api/agendamentos simultâneos, mesmo barbeiro/horário ---");
    const client2 = new Client({ host: "127.0.0.1", port: PORTA, user: "postgres", password: "postgres", database: "postgres" });
    await client2.connect();
    const [r1, r2] = await Promise.all([
      criarAgendamento(client, { id: 1, barbeiroId: 1, servicoId: 1, inicio: "2026-10-01 09:00:00", fim: "2026-10-01 09:30:00", valorCentavos: 5000 }),
      criarAgendamento(client2, { id: 2, barbeiroId: 1, servicoId: 1, inicio: "2026-10-01 09:00:00", fim: "2026-10-01 09:30:00", valorCentavos: 5000 }),
    ]);
    const aceitas = [r1, r2].filter((r) => r.ok).length;
    const rejeitada = [r1, r2].find((r) => !r.ok);
    assert(
      "Cenário 1: exatamente 1 aceito, 1 rejeitado com 23P01",
      aceitas === 1 && rejeitada?.codigo === "23P01",
      `aceitas=${aceitas}, rejeitada.codigo=${rejeitada?.codigo}`
    );
    await client2.end();

    console.log("\n--- Cenário 2: reativar agendamento cancelado com conflito existente ---");
    // Agendamento 3 ocupa 10:00-10:30; agendamento 4 é criado no mesmo horário só depois
    // de cancelar o 3 (então não conflita na criação) — depois tentamos reativar o 3.
    await criarAgendamento(client, { id: 3, barbeiroId: 2, servicoId: 1, inicio: "2026-10-01 10:00:00", fim: "2026-10-01 10:30:00", valorCentavos: 5000 });
    await editarStatusAgendamento(client, { id: 3, barbeiroId: 2, inicio: "2026-10-01 10:00:00", fim: "2026-10-01 10:30:00", novoStatus: "cancelado" });
    const criacao4 = await criarAgendamento(client, { id: 4, barbeiroId: 2, servicoId: 1, inicio: "2026-10-01 10:00:00", fim: "2026-10-01 10:30:00", valorCentavos: 5000 });
    assert("Cenário 2 (pré-condição): agendamento 4 criado normalmente após o 3 ser cancelado", criacao4.ok);

    const reativacao3 = await editarStatusAgendamento(client, { id: 3, barbeiroId: 2, inicio: "2026-10-01 10:00:00", fim: "2026-10-01 10:30:00", novoStatus: "confirmado" });
    assert(
      "Cenário 2: reativar o agendamento 3 (mesmo horário do 4, já confirmado) é rejeitado com 23P01",
      !reativacao3.ok && reativacao3.codigo === "23P01",
      `ok=${reativacao3.ok}, codigo=${reativacao3.codigo}`
    );
    const status3 = await client.query(`SELECT status FROM agendamentos WHERE id=3`);
    assert("Cenário 2: agendamento 3 continua cancelado no banco (rollback da tentativa)", status3.rows[0].status === "cancelado");

    console.log("\n--- Cenário 3: criar agendamento dentro de um bloqueio existente ---");
    const bloqueio1 = await criarBloqueio(client, { id: 1, barbeiroId: 1, inicio: "2026-10-02 09:00:00", fim: "2026-10-02 12:00:00" });
    assert("Cenário 3 (pré-condição): bloqueio criado normalmente", bloqueio1.ok);
    const agendamentoNoBloqueio = await criarAgendamento(client, { id: 5, barbeiroId: 1, servicoId: 1, inicio: "2026-10-02 10:00:00", fim: "2026-10-02 10:30:00", valorCentavos: 5000 });
    assert(
      "Cenário 3: agendamento dentro do bloqueio é rejeitado com 23P01",
      !agendamentoNoBloqueio.ok && agendamentoNoBloqueio.codigo === "23P01",
      `ok=${agendamentoNoBloqueio.ok}, codigo=${agendamentoNoBloqueio.codigo}`
    );

    console.log("\n--- Fluxo de verificação por WhatsApp: cadastro → código → confirmação ---");
    await client.query(`INSERT INTO clientes (id, nome, telefone, senha_hash) VALUES (2,'Cliente Novo','11955553333','hash-novo')`);
    let agora = new Date("2026-10-01T12:00:00Z");
    const envioNovo = await tentarEnviarCodigo(client, 2, "203.0.113.1", agora);
    assert("Fluxo normal: código enviado para cliente novo", envioNovo.ok);
    const confirmaNovo = await confirmarCodigo(client, 2, envioNovo.codigo, agora);
    assert("Fluxo normal: código correto confirma", confirmaNovo.ok);
    const verificado = await client.query(`SELECT telefone_verificado FROM clientes WHERE id=2`);
    assert("Fluxo normal: telefone_verificado=true após confirmar", verificado.rows[0].telefone_verificado === true);

    console.log("\n--- Regressão: sequestro de conta (Fase 4) ---");
    const senhaOriginal = (await client.query(`SELECT senha_hash FROM clientes WHERE id=1`)).rows[0].senha_hash;
    const vinculo = await cadastroPublicoVincula(client, "11955554444", "Nome do Atacante", "hash-do-atacante");
    assert("Sequestro: cadastro público com telefone do balcão vincula (não duplica)", vinculo.vinculado === true && vinculo.id === 1);

    const senhaAposVinculo = (await client.query(`SELECT senha_hash, telefone_verificado FROM clientes WHERE id=1`)).rows[0];
    assert(
      "Sequestro: senha NÃO muda imediatamente, telefone_verificado forçado para false",
      senhaAposVinculo.senha_hash === senhaOriginal && senhaAposVinculo.telefone_verificado === false
    );

    agora = new Date(agora.getTime() + 60_000);
    const tentativaAtacante = await confirmarCodigo(client, 1, "000000", agora);
    assert("Sequestro: atacante tentando adivinhar o código é rejeitado", tentativaAtacante.ok === false);

    // O "dono real" recebe o código de verdade no WhatsApp (simulado: geramos e
    // guardamos como se enviarCodigoVerificacao tivesse rodado) e confirma.
    agora = new Date(agora.getTime() + 5_000);
    const envioDono = await tentarEnviarCodigo(client, 1, "198.51.100.1", agora);
    assert("Sequestro: dono real consegue pedir/receber um código", envioDono.ok);
    const confirmaDono = await confirmarCodigo(client, 1, envioDono.codigo, agora);
    assert("Sequestro: dono real confirma com o código verdadeiro", confirmaDono.ok);

    const clienteFinal = await client.query(`SELECT senha_hash, nome, telefone_verificado FROM clientes WHERE id=1`);
    assert(
      "Sequestro: só após confirmação de verdade a senha/nome pendentes são aplicados",
      clienteFinal.rows[0].senha_hash === "hash-do-atacante" &&
        clienteFinal.rows[0].nome === "Nome do Atacante" &&
        clienteFinal.rows[0].telefone_verificado === true,
      "(aqui \"atacante\" só é o nome de teste do dado que o dono real informou no cadastro público — quem confirmou foi o dono, via código recebido no telefone dele)"
    );

    console.log("\n--- Regressão: rate-limiting (regra 7) — 4ª tentativa rejeitada ---");
    let t = new Date("2026-10-03T12:00:00Z");
    const rl1 = await tentarEnviarCodigo(client, 1, "203.0.113.50", t);
    t = new Date(t.getTime() + 65_000);
    const rl2 = await tentarEnviarCodigo(client, 1, "203.0.113.50", t);
    t = new Date(t.getTime() + 185_000);
    const rl3 = await tentarEnviarCodigo(client, 1, "203.0.113.50", t);
    t = new Date(t.getTime() + 5_000); // bem antes dos 15min abrirem de novo
    const rl4 = await tentarEnviarCodigo(client, 1, "203.0.113.50", t);
    assert(
      "Rate-limit: 3 primeiras aceitas (respeitando backoff), 4ª rejeitada",
      rl1.ok && rl2.ok && rl3.ok && !rl4.ok,
      `rl1=${rl1.ok} rl2=${rl2.ok} rl3=${rl3.ok} rl4=${rl4.ok}(${rl4.motivo})`
    );

    console.log("\n" + "=".repeat(70));
    const falhas = resultados.filter((r) => !r.ok);
    if (falhas.length === 0) {
      console.log(`✅ TODOS OS ${resultados.length} CENÁRIOS PASSARAM.`);
    } else {
      console.log(`❌ ${falhas.length} DE ${resultados.length} CENÁRIOS FALHARAM.`);
    }
  } catch (erro) {
    console.error("\nERRO INESPERADO NA SUÍTE:", erro);
    process.exitCode = 1;
  } finally {
    // `pg.stop()` (embedded-postgres) e/ou `client.end()` já foram observados sem nunca
    // resolver em alguns runs deste ambiente, mesmo com todos os testes já concluídos
    // (o processo Postgres real sobe/roda normalmente — só o desligamento não retorna) —
    // por isso a limpeza tem um teto de tempo e, mais importante, o processo força sua
    // própria saída logo depois, para nunca ficar pendurado esperando cleanup.
    const comTeto = (promessa, ms) => Promise.race([promessa, new Promise((r) => setTimeout(r, ms))]);
    await comTeto(client.end().catch(() => {}), 5_000);
    await comTeto(pg.stop().catch(() => {}), 10_000);
  }
}

await main();
// Ver comentário no `finally` de `main()` — força a saída mesmo se algum handle (do
// Postgres embarcado ou de alguma conexão) tiver ficado aberto e impedisse o processo
// de encerrar sozinho.
process.exit(process.exitCode ?? 0);
