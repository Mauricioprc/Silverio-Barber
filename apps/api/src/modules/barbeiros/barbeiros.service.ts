import { and, eq, gte, ne } from "drizzle-orm";
import type { Db } from "../../db/client";
import { agendamentos, barbeiroServicos, barbeiros, disponibilidadeBarbeiro, servicos, usuarios } from "../../db/schema";
import { seSobrepoem } from "../../shared/disponibilidade/disponibilidade.util";
import type { AlternarVinculoServicoInput, SubstituirDisponibilidadeInput } from "./barbeiros.schema";

export class ServicoNaoEncontradoError extends Error {
  constructor() {
    super("Serviço não encontrado.");
    this.name = "ServicoNaoEncontradoError";
  }
}

export class BarbeiroNaoEncontradoError extends Error {
  constructor() {
    super("Barbeiro não encontrado.");
    this.name = "BarbeiroNaoEncontradoError";
  }
}

/**
 * Lançado quando salvar uma pausa nova/editada esbarraria num agendamento futuro já
 * confirmado (Fase D, item 5 — mesma garantia que Bloqueios já dá hoje: não deixa
 * silenciosamente criar uma pausa que "engole" um horário já marcado).
 */
export class ConflitoComAgendamentoExistenteError extends Error {
  constructor(public quantidade: number) {
    super(
      `${quantidade} agendamento${quantidade > 1 ? "s" : ""} confirmado${quantidade > 1 ? "s" : ""} cairia${quantidade > 1 ? "m" : ""} dentro da nova pausa. Cancele ou reagende antes de salvar.`
    );
    this.name = "ConflitoComAgendamentoExistenteError";
  }
}

function agoraLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * `filtroBarbeiroId` restringe o resultado a um único registro — usado pra não-admin, que
 * só pode ver o próprio (ver `barbeiros.routes.ts`, `escopo.barbeiroId`). Admin chama sem
 * esse filtro e recebe a lista inteira, como sempre.
 */
export async function listarBarbeiros(db: Db, filtroBarbeiroId?: number) {
  return db
    .select({
      id: barbeiros.id,
      usuarioId: barbeiros.usuarioId,
      ativo: barbeiros.ativo,
      nome: usuarios.nome,
      usuario: usuarios.usuario,
      telefone: usuarios.telefone,
    })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(filtroBarbeiroId !== undefined ? eq(barbeiros.id, filtroBarbeiroId) : undefined);
}

async function existeBarbeiro(db: Db, barbeiroId: number): Promise<boolean> {
  const [encontrado] = await db.select({ id: barbeiros.id }).from(barbeiros).where(eq(barbeiros.id, barbeiroId)).limit(1);
  return Boolean(encontrado);
}

/**
 * `nome` atualiza `usuarios.nome` (via `usuarioId` do barbeiro) — feito fora de transação
 * porque as duas escritas são independentes e nenhuma delas precisa desfazer a outra se a
 * segunda falhar.
 */
export async function atualizarBarbeiro(db: Db, barbeiroId: number, dados: { ativo?: boolean; nome?: string }) {
  const [existente] = await db.select({ usuarioId: barbeiros.usuarioId }).from(barbeiros).where(eq(barbeiros.id, barbeiroId)).limit(1);
  if (!existente) {
    throw new BarbeiroNaoEncontradoError();
  }

  if (dados.ativo !== undefined) {
    await db.update(barbeiros).set({ ativo: dados.ativo }).where(eq(barbeiros.id, barbeiroId));
  }

  if (dados.nome !== undefined) {
    await db.update(usuarios).set({ nome: dados.nome }).where(eq(usuarios.id, existente.usuarioId));
  }

  const [barbeiro] = await db
    .select({
      id: barbeiros.id,
      usuarioId: barbeiros.usuarioId,
      ativo: barbeiros.ativo,
      nome: usuarios.nome,
      usuario: usuarios.usuario,
      telefone: usuarios.telefone,
    })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(eq(barbeiros.id, barbeiroId))
    .limit(1);

  if (!barbeiro) throw new BarbeiroNaoEncontradoError();
  return barbeiro;
}

export async function listarDisponibilidade(db: Db, barbeiroId: number) {
  if (!(await existeBarbeiro(db, barbeiroId))) {
    throw new BarbeiroNaoEncontradoError();
  }

  return db
    .select({
      id: disponibilidadeBarbeiro.id,
      diaSemana: disponibilidadeBarbeiro.diaSemana,
      horaInicio: disponibilidadeBarbeiro.horaInicio,
      horaFim: disponibilidadeBarbeiro.horaFim,
      pausaInicio: disponibilidadeBarbeiro.pausaInicio,
      pausaFim: disponibilidadeBarbeiro.pausaFim,
    })
    .from(disponibilidadeBarbeiro)
    .where(eq(disponibilidadeBarbeiro.barbeiroId, barbeiroId));
}

/**
 * Barra a gravação se alguma faixa com pausa nova/editada esbarraria num agendamento
 * futuro não cancelado desse barbeiro (Fase D, item 5) — mesma garantia que Bloqueios já
 * dá hoje (lá, a exclusion constraint recusa sozinha; aqui a pausa vive em
 * `disponibilidade_barbeiro`, que não passa por aquela constraint, então a checagem
 * precisa ser explícita). Só olha agendamentos futuros: o passado não pode mais colidir
 * com nada.
 */
async function validarSemConflitoComAgendamentos(db: Db, barbeiroId: number, dados: SubstituirDisponibilidadeInput) {
  const faixasComPausa = dados.disponibilidade.filter((f) => f.pausaInicio !== undefined && f.pausaFim !== undefined);
  if (faixasComPausa.length === 0) return;

  const futuros = await db
    .select({ inicio: agendamentos.inicio, fim: agendamentos.fim })
    .from(agendamentos)
    .where(and(eq(agendamentos.barbeiroId, barbeiroId), gte(agendamentos.inicio, agoraLocal()), ne(agendamentos.status, "cancelado")));

  let conflitos = 0;
  for (const agendamento of futuros) {
    const dataAgendamento = agendamento.inicio.slice(0, 10);
    const diaSemana = new Date(`${dataAgendamento}T00:00:00Z`).getUTCDay();
    const faixa = faixasComPausa.find((f) => f.diaSemana === diaSemana);
    if (!faixa) continue;

    const horaInicioAgendamento = agendamento.inicio.slice(11, 19);
    const horaFimAgendamento = agendamento.fim.slice(11, 19);
    if (seSobrepoem(horaInicioAgendamento, horaFimAgendamento, faixa.pausaInicio!, faixa.pausaFim!)) {
      conflitos += 1;
    }
  }

  if (conflitos > 0) {
    throw new ConflitoComAgendamentoExistenteError(conflitos);
  }
}

/**
 * Substitui a disponibilidade semanal inteira do barbeiro (apaga tudo e recria a partir
 * da lista recebida). Executado em transação: uma falha na inserção não deve deixar o
 * barbeiro sem nenhuma disponibilidade registrada.
 */
export async function substituirDisponibilidade(db: Db, barbeiroId: number, dados: SubstituirDisponibilidadeInput) {
  if (!(await existeBarbeiro(db, barbeiroId))) {
    throw new BarbeiroNaoEncontradoError();
  }

  await validarSemConflitoComAgendamentos(db, barbeiroId, dados);

  return db.transaction(async (tx) => {
    await tx.delete(disponibilidadeBarbeiro).where(eq(disponibilidadeBarbeiro.barbeiroId, barbeiroId));

    if (dados.disponibilidade.length === 0) {
      return [];
    }

    return tx
      .insert(disponibilidadeBarbeiro)
      .values(
        dados.disponibilidade.map((faixa) => ({
          barbeiroId,
          diaSemana: faixa.diaSemana,
          horaInicio: faixa.horaInicio,
          horaFim: faixa.horaFim,
          pausaInicio: faixa.pausaInicio ?? null,
          pausaFim: faixa.pausaFim ?? null,
        }))
      )
      .returning();
  });
}

/**
 * Catálogo inteiro de serviços (ativos e inativos — mesma regra de `GET /servicos` sem
 * `?ativos=1`, pra permitir reativar um vínculo de um serviço que também está desativado
 * no catálogo) com o vínculo deste barbeiro, se existir (Fase D). `vinculado: false`
 * tanto pra "nunca teve vínculo" quanto pra "vínculo existe mas está desativado" — do
 * ponto de vista de quem chama, as duas situações significam a mesma coisa: "não faz".
 */
export async function listarServicosDoBarbeiro(db: Db, barbeiroId: number) {
  if (!(await existeBarbeiro(db, barbeiroId))) {
    throw new BarbeiroNaoEncontradoError();
  }

  const linhas = await db
    .select({
      id: servicos.id,
      nome: servicos.nome,
      valorCentavos: servicos.valorCentavos,
      duracaoMinutos: servicos.duracaoMinutos,
      ativoNoCatalogo: servicos.ativo,
      vinculoAtivo: barbeiroServicos.ativo,
    })
    .from(servicos)
    .leftJoin(barbeiroServicos, and(eq(barbeiroServicos.servicoId, servicos.id), eq(barbeiroServicos.barbeiroId, barbeiroId)));

  return linhas.map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    valorCentavos: linha.valorCentavos,
    duracaoMinutos: linha.duracaoMinutos,
    ativoNoCatalogo: linha.ativoNoCatalogo,
    vinculado: linha.vinculoAtivo === true,
  }));
}

/**
 * Upsert do vínculo (Fase D) — `ON CONFLICT` na constraint única (barbeiroId, servicoId)
 * criada na migração: primeira vez que o barbeiro mexe num serviço, insere a linha;
 * depois disso, só alterna `ativo` na linha existente. Nunca apaga a linha (soft delete,
 * mesma regra 5 do resto do projeto).
 */
export async function alternarVinculoServico(
  db: Db,
  barbeiroId: number,
  servicoId: number,
  dados: AlternarVinculoServicoInput
) {
  if (!(await existeBarbeiro(db, barbeiroId))) {
    throw new BarbeiroNaoEncontradoError();
  }
  const [servico] = await db.select({ id: servicos.id }).from(servicos).where(eq(servicos.id, servicoId)).limit(1);
  if (!servico) {
    throw new ServicoNaoEncontradoError();
  }

  const [vinculo] = await db
    .insert(barbeiroServicos)
    .values({ barbeiroId, servicoId, ativo: dados.ativo })
    .onConflictDoUpdate({
      target: [barbeiroServicos.barbeiroId, barbeiroServicos.servicoId],
      set: { ativo: dados.ativo },
    })
    .returning();

  return vinculo;
}
