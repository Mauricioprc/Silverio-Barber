import { and, desc, eq, gt, gte, isNull } from "drizzle-orm";
import type { Db } from "../../db/client";
import { clientes, codigosVerificacao } from "../../db/schema";
import type { EnviadorWhatsapp } from "../../shared/whatsapp/enviador-whatsapp";
import { calcularExpiracaoCodigo, gerarCodigo, hashCodigo } from "./verificacao.util";

/**
 * Regra 7 do documento de convenções: **no máximo 3 envios por telefone (aqui,
 * `clienteId` — 1:1 com telefone) a cada 15 minutos, com backoff crescente entre
 * tentativas, mais limite complementar por IP.**
 *
 * Backoff adotado: 1º envio na janela é livre; o 2º exige pelo menos 60s desde o
 * anterior; o 3º exige pelo menos 180s desde o anterior; a partir do 4º (dentro dos
 * últimos 15 min), bloqueado até o envio mais antigo sair da janela. Limite de IP:
 * 10 envios por IP a cada 15 minutos (mais frouxo — só dificulta abuso via vários
 * telefones/contas a partir da mesma origem, o limite por cliente já é a defesa
 * principal).
 */
const JANELA_MS = 15 * 60_000;
const MAX_ENVIOS_POR_CLIENTE_NA_JANELA = 3;
const MAX_ENVIOS_POR_IP_NA_JANELA = 10;
/** Índice = quantos envios já existem na janela; valor = segundos de espera exigidos desde o último. */
const BACKOFF_SEGUNDOS = [0, 60, 180];

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSegundos: number) {
    super("Muitas tentativas de envio de código. Aguarde antes de tentar novamente.");
    this.name = "RateLimitError";
  }
}

export class CodigoInvalidoError extends Error {
  constructor() {
    // Mensagem genérica de propósito — mesma lógica anti-enumeração da regra 3: não
    // diferenciar "código errado" de "código expirado" ou "nenhum código pendente".
    super("Código inválido ou expirado.");
    this.name = "CodigoInvalidoError";
  }
}

/**
 * Gera e envia um novo código de verificação para o telefone do cliente da sessão
 * (nunca aceita telefone vindo do corpo da requisição — ver README, é isso que fecha a
 * porta de "mandar WhatsApp pra qualquer número de graça"). Lança `RateLimitError` com
 * `retryAfterSegundos` se algum dos limites acima for excedido; nesse caso, nenhum
 * código é gerado nem mensagem é enviada.
 */
export async function enviarCodigoVerificacao(
  db: Db,
  enviador: EnviadorWhatsapp,
  clienteId: number,
  ip: string
): Promise<void> {
  const [cliente] = await db.select({ telefone: clientes.telefone }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  if (!cliente) {
    throw new Error("Cliente da sessão não encontrado — sessão inconsistente.");
  }

  const agora = new Date();
  const inicioJanela = new Date(agora.getTime() - JANELA_MS);

  const enviosClienteNaJanela = await db
    .select({ criadoEm: codigosVerificacao.criadoEm })
    .from(codigosVerificacao)
    .where(and(eq(codigosVerificacao.clienteId, clienteId), gte(codigosVerificacao.criadoEm, inicioJanela)))
    .orderBy(desc(codigosVerificacao.criadoEm));

  if (enviosClienteNaJanela.length >= MAX_ENVIOS_POR_CLIENTE_NA_JANELA) {
    const maisAntigo = enviosClienteNaJanela[enviosClienteNaJanela.length - 1]!.criadoEm;
    const retryAfterSegundos = Math.max(1, Math.ceil((maisAntigo.getTime() + JANELA_MS - agora.getTime()) / 1000));
    throw new RateLimitError(retryAfterSegundos);
  }

  const gapExigidoSegundos = BACKOFF_SEGUNDOS[enviosClienteNaJanela.length] ?? Infinity;
  if (enviosClienteNaJanela.length > 0 && gapExigidoSegundos > 0) {
    const ultimoEnvio = enviosClienteNaJanela[0]!.criadoEm;
    const decorridoSegundos = (agora.getTime() - ultimoEnvio.getTime()) / 1000;
    if (decorridoSegundos < gapExigidoSegundos) {
      throw new RateLimitError(Math.ceil(gapExigidoSegundos - decorridoSegundos));
    }
  }

  const enviosIpNaJanela = await db
    .select({ id: codigosVerificacao.id })
    .from(codigosVerificacao)
    .where(and(eq(codigosVerificacao.ip, ip), gte(codigosVerificacao.criadoEm, inicioJanela)));

  if (enviosIpNaJanela.length >= MAX_ENVIOS_POR_IP_NA_JANELA) {
    throw new RateLimitError(15 * 60);
  }

  const codigo = gerarCodigo();
  const codigoHash = await hashCodigo(codigo);
  const expiraEm = calcularExpiracaoCodigo();

  await db.insert(codigosVerificacao).values({ clienteId, ip, codigoHash, expiraEm });

  await enviador.enviarTexto(
    cliente.telefone,
    `Seu código de verificação Silvério Barbearia é ${codigo}. Válido por 10 minutos. Não compartilhe.`
  );
}

/**
 * Confirma o código mais recente, não usado e não expirado do cliente. Marca
 * `usado_em` (o código nunca pode ser reutilizado, mesmo dentro da validade) e
 * `clientes.telefone_verificado = true`. Lança `CodigoInvalidoError` (mensagem
 * genérica) em qualquer caso de falha — errado, expirado, ou já usado.
 *
 * Também aplica `nomePendente`/`senhaHashPendente`, se houver (fluxo de vínculo de
 * cadastro público a uma conta pré-existente — ver `clientes-publico.service.ts`): só
 * agora, com o telefone de fato confirmado como do próprio dono, a senha/nome que a
 * pessoa informou no cadastro público passam a valer de verdade. Sem código pendente
 * (cliente que já não tinha nenhum vínculo pendente), isso é um no-op.
 */
export async function confirmarCodigoVerificacao(db: Db, clienteId: number, codigo: string): Promise<void> {
  const codigoHash = await hashCodigo(codigo);
  const agora = new Date();

  const [registro] = await db
    .select({ id: codigosVerificacao.id })
    .from(codigosVerificacao)
    .where(
      and(
        eq(codigosVerificacao.clienteId, clienteId),
        eq(codigosVerificacao.codigoHash, codigoHash),
        gt(codigosVerificacao.expiraEm, agora),
        isNull(codigosVerificacao.usadoEm)
      )
    )
    .orderBy(desc(codigosVerificacao.criadoEm))
    .limit(1);

  if (!registro) {
    throw new CodigoInvalidoError();
  }

  await db.update(codigosVerificacao).set({ usadoEm: agora }).where(eq(codigosVerificacao.id, registro.id));

  const [clienteAtual] = await db
    .select({ nomePendente: clientes.nomePendente, senhaHashPendente: clientes.senhaHashPendente })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  await db
    .update(clientes)
    .set({
      telefoneVerificado: true,
      ...(clienteAtual?.nomePendente !== undefined && clienteAtual?.nomePendente !== null
        ? { nome: clienteAtual.nomePendente }
        : {}),
      ...(clienteAtual?.senhaHashPendente !== undefined && clienteAtual?.senhaHashPendente !== null
        ? { senhaHash: clienteAtual.senhaHashPendente }
        : {}),
      nomePendente: null,
      senhaHashPendente: null,
    })
    .where(eq(clientes.id, clienteId));
}
