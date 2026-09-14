import { and, eq, gte, lt } from "drizzle-orm";
import type { Db, DbOuTx } from "../../db/client";
import { agendamentos, barbeiros, servicos } from "../../db/schema";
import { inserirOcupacao, removerOcupacaoDeAgendamento } from "../../shared/ocupacao/ocupacao.util";
import type { CriarAgendamentoInput, EditarAgendamentoInput } from "./agendamentos.schema";
import { inicioDoDiaSeguinte, somarMinutos } from "./data.util";

export class BarbeiroInvalidoError extends Error {
  constructor() {
    super("Barbeiro não encontrado ou inativo.");
    this.name = "BarbeiroInvalidoError";
  }
}

export class ServicoInvalidoError extends Error {
  constructor() {
    super("Serviço não encontrado ou inativo.");
    this.name = "ServicoInvalidoError";
  }
}

export class AgendamentoNaoEncontradoError extends Error {
  constructor() {
    super("Agendamento não encontrado.");
    this.name = "AgendamentoNaoEncontradoError";
  }
}

export async function listarAgendamentosDoDia(db: Db, barbeiroId: number, data: string) {
  const inicioDia = `${data} 00:00:00`;
  const inicioDiaSeguinte = inicioDoDiaSeguinte(data);

  return db
    .select()
    .from(agendamentos)
    .where(
      and(
        eq(agendamentos.barbeiroId, barbeiroId),
        gte(agendamentos.inicio, inicioDia),
        lt(agendamentos.inicio, inicioDiaSeguinte)
      )
    );
}

/**
 * Cria o agendamento: valida barbeiro/serviço ativos, copia valor/duração do serviço
 * (regra 5 — nunca referenciar ao vivo) e grava a linha-espelho em `ocupacoes_barbeiro`
 * na mesma transação. Se a exclusion constraint rejeitar por conflito de horário, o
 * `ConflitoHorarioError` lançado por `inserirOcupacao` sobe para o chamador (a rota
 * traduz para 409) e a transação inteira é desfeita — nenhum agendamento órfão fica
 * gravado.
 */
export async function criarAgendamento(db: Db, dados: CriarAgendamentoInput) {
  const [barbeiro] = await db
    .select({ id: barbeiros.id, ativo: barbeiros.ativo })
    .from(barbeiros)
    .where(eq(barbeiros.id, dados.barbeiroId))
    .limit(1);
  if (!barbeiro || !barbeiro.ativo) {
    throw new BarbeiroInvalidoError();
  }

  const [servico] = await db
    .select({ id: servicos.id, ativo: servicos.ativo, duracaoMinutos: servicos.duracaoMinutos, valorCentavos: servicos.valorCentavos })
    .from(servicos)
    .where(eq(servicos.id, dados.servicoId))
    .limit(1);
  if (!servico || !servico.ativo) {
    throw new ServicoInvalidoError();
  }

  const inicio = dados.inicio.length === 16 ? `${dados.inicio}:00` : dados.inicio;
  const fim = somarMinutos(inicio, servico.duracaoMinutos);

  return db.transaction(async (tx) => {
    const [agendamento] = await tx
      .insert(agendamentos)
      .values({
        barbeiroId: dados.barbeiroId,
        servicoId: dados.servicoId,
        nomeCliente: dados.nomeCliente,
        telefoneCliente: dados.telefoneCliente,
        inicio,
        fim,
        valorCobradoCentavos: servico.valorCentavos,
      })
      .returning();

    if (!agendamento) {
      throw new Error("Falha inesperada ao criar agendamento.");
    }

    await inserirOcupacao(tx, {
      tipo: "agendamento",
      agendamentoId: agendamento.id,
      barbeiroId: dados.barbeiroId,
      inicio,
      fim,
    });

    return agendamento;
  });
}

async function buscarAgendamento(db: DbOuTx, id: number) {
  const [agendamento] = await db.select().from(agendamentos).where(eq(agendamentos.id, id)).limit(1);
  if (!agendamento) {
    throw new AgendamentoNaoEncontradoError();
  }
  return agendamento;
}

/**
 * Edita status e/ou reagenda (horário/barbeiro). A linha de ocupação é sempre refeita
 * (apagada e, se aplicável, reinserida) dentro da mesma transação — não só quando
 * horário/barbeiro mudam. Isso é necessário porque reativar um agendamento cancelado
 * (`status: cancelado` → `confirmado`, sem mudar horário) também precisa recriar a
 * ocupação: a linha foi removida no cancelamento anterior, e sem recriá-la a trava de
 * conflito (regra 8) fica desligada para esse agendamento — dois agendamentos
 * confirmados no mesmo horário passariam despercebidos. Reagendar (mudar horário/
 * barbeiro) passa pela exclusion constraint de novo do mesmo jeito, pela reinserção.
 * Marcar como `cancelado` libera a ocupação (soft delete só na tabela `agendamentos` —
 * ver comentário em `db/schema.ts`); qualquer outro status (`confirmado`/`concluido`)
 * mantém/recria a ocupação — o horário continua "ocupado" para fins de trava/histórico.
 */
export async function editarAgendamento(db: Db, id: number, dados: EditarAgendamentoInput) {
  return db.transaction(async (tx) => {
    const atual = await buscarAgendamento(tx, id);

    let barbeiroId = atual.barbeiroId;
    if (dados.barbeiroId !== undefined) {
      const [barbeiro] = await tx
        .select({ id: barbeiros.id, ativo: barbeiros.ativo })
        .from(barbeiros)
        .where(eq(barbeiros.id, dados.barbeiroId))
        .limit(1);
      if (!barbeiro || !barbeiro.ativo) {
        throw new BarbeiroInvalidoError();
      }
      barbeiroId = dados.barbeiroId;
    }

    const duracaoMinutos = diferencaEmMinutos(atual.inicio, atual.fim);
    let inicio = atual.inicio;
    let fim = atual.fim;
    if (dados.inicio !== undefined) {
      inicio = dados.inicio.length === 16 ? `${dados.inicio}:00` : dados.inicio;
      fim = somarMinutos(inicio, duracaoMinutos);
    }

    const novoStatus = dados.status ?? atual.status;

    const [atualizado] = await tx
      .update(agendamentos)
      .set({ barbeiroId, inicio, fim, status: novoStatus })
      .where(eq(agendamentos.id, id))
      .returning();

    if (!atualizado) {
      throw new AgendamentoNaoEncontradoError();
    }

    // Sempre remove a ocupação atual e, se o agendamento continua/passa a valer para fins
    // de trava de conflito (todo status exceto `cancelado`), reinsere com o horário/
    // barbeiro vigentes — cobre reagendar E reativar um agendamento cancelado.
    await removerOcupacaoDeAgendamento(tx, id);
    if (novoStatus !== "cancelado") {
      await inserirOcupacao(tx, { tipo: "agendamento", agendamentoId: id, barbeiroId, inicio, fim });
    }

    return atualizado;
  });
}

/** Diferença em minutos entre dois horários "YYYY-MM-DD HH:MM:SS" (ver `data.util.ts`). */
function diferencaEmMinutos(inicio: string, fim: string): number {
  const paraData = (horario: string) => new Date(`${horario.replace(" ", "T")}Z`);
  return Math.round((paraData(fim).getTime() - paraData(inicio).getTime()) / 60_000);
}
