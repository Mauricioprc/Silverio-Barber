import { eq } from "drizzle-orm";
import type { DbOuTx } from "../../db/client";
import { ocupacoesBarbeiro } from "../../db/schema";

/**
 * Usado por `agendamentos` e `bloqueios` (por isso vive em `shared/`) para manter a
 * linha-espelho em `ocupacoes_barbeiro` — a tabela que de fato carrega a exclusion
 * constraint de conflito de horário (ver comentário em `db/schema.ts`). Toda função aqui
 * espera receber `tx` (o `Db`/transação já aberta pelo chamador) porque inserir/apagar a
 * linha de ocupação precisa ser atômico junto com a escrita em `agendamentos`/
 * `bloqueios_agenda` — nunca chame isso fora de uma transação.
 */

/** Código de erro do Postgres para violação de exclusion constraint. */
const CODIGO_EXCLUSION_VIOLATION = "23P01";

export class ConflitoHorarioError extends Error {
  constructor() {
    super("Este barbeiro já tem um agendamento ou bloqueio nesse horário.");
    this.name = "ConflitoHorarioError";
  }
}

/** True se o erro veio da exclusion constraint `ocupacoes_barbeiro_sem_sobreposicao`. */
export function ehErroDeConflitoHorario(erro: unknown): boolean {
  const codigo = (erro as { code?: unknown } | null)?.code;
  if (codigo === CODIGO_EXCLUSION_VIOLATION) return true;

  // Defesa adicional: nem todo driver expõe `.code` de forma previsível através das
  // camadas do Neon/WebSocket — cai para inspecionar a mensagem se o código não vier.
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return /ocupacoes_barbeiro_sem_sobreposicao|exclusion/i.test(mensagem);
}

type NovaOcupacaoAgendamento = {
  tipo: "agendamento";
  agendamentoId: number;
  barbeiroId: number;
  inicio: string;
  fim: string;
};

type NovaOcupacaoBloqueio = {
  tipo: "bloqueio";
  bloqueioId: number;
  barbeiroId: number;
  inicio: string;
  fim: string;
};

/**
 * Insere a linha de ocupação. Lança `ConflitoHorarioError` (nunca deixa o erro bruto do
 * Postgres subir) se a exclusion constraint rejeitar por sobreposição — o chamador deve
 * estar dentro de uma transação para que o `insert` de `agendamentos`/`bloqueios_agenda`
 * seja desfeito junto.
 */
export async function inserirOcupacao(tx: DbOuTx, dados: NovaOcupacaoAgendamento | NovaOcupacaoBloqueio): Promise<void> {
  try {
    await tx.insert(ocupacoesBarbeiro).values({
      barbeiroId: dados.barbeiroId,
      inicio: dados.inicio,
      fim: dados.fim,
      tipo: dados.tipo,
      agendamentoId: dados.tipo === "agendamento" ? dados.agendamentoId : null,
      bloqueioId: dados.tipo === "bloqueio" ? dados.bloqueioId : null,
    });
  } catch (erro) {
    if (ehErroDeConflitoHorario(erro)) {
      throw new ConflitoHorarioError();
    }
    throw erro;
  }
}

export async function removerOcupacaoDeAgendamento(tx: DbOuTx, agendamentoId: number): Promise<void> {
  await tx.delete(ocupacoesBarbeiro).where(eq(ocupacoesBarbeiro.agendamentoId, agendamentoId));
}

export async function removerOcupacaoDeBloqueio(tx: DbOuTx, bloqueioId: number): Promise<void> {
  await tx.delete(ocupacoesBarbeiro).where(eq(ocupacoesBarbeiro.bloqueioId, bloqueioId));
}
