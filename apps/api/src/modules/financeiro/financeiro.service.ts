import { and, eq, gte, lt, sum } from "drizzle-orm";
import type { DbOuTx, Db } from "../../db/client";
import { lancamentosFinanceiros } from "../../db/schema";
import type { FiltroFinanceiroInput } from "./financeiro.schema";
import { inicioDoDiaBrasiliaUtc, inicioDoDiaSeguinteBrasiliaUtc } from "./fuso.util";

type NovoLancamento = {
  agendamentoId: number;
  barbeiroId: number;
  valorCentavos: number;
};

/**
 * Cria o lançamento se ainda não existir um para este agendamento — idempotência
 * garantida pela constraint `unique()` em `lancamentos_financeiros.agendamento_id` (ver
 * comentário em `db/schema.ts`), não por uma checagem "SELECT antes de INSERT" (que
 * seria vulnerável a corrida). Chamado de dentro da transação de
 * `agendamentos.service.ts` quando um agendamento passa a ter `status = 'concluido'`.
 */
export async function criarLancamentoSeNecessario(tx: DbOuTx, dados: NovoLancamento): Promise<void> {
  await tx
    .insert(lancamentosFinanceiros)
    .values(dados)
    .onConflictDoNothing({ target: lancamentosFinanceiros.agendamentoId });
}

/**
 * Remove o lançamento do agendamento, se existir — chamado quando um agendamento que
 * estava `concluido` passa para qualquer outro status (decisão documentada em
 * `db/schema.ts` e no README: reverter a conclusão remove o lançamento, não deixa um
 * registro "órfão").
 */
export async function removerLancamentoDeAgendamento(tx: DbOuTx, agendamentoId: number): Promise<void> {
  await tx.delete(lancamentosFinanceiros).where(eq(lancamentosFinanceiros.agendamentoId, agendamentoId));
}

function condicoesDoPeriodo(filtro: FiltroFinanceiroInput) {
  const condicoes = [];
  if (filtro.barbeiro_id !== undefined) {
    condicoes.push(eq(lancamentosFinanceiros.barbeiroId, filtro.barbeiro_id));
  }
  if (filtro.de !== undefined) {
    condicoes.push(gte(lancamentosFinanceiros.criadoEm, inicioDoDiaBrasiliaUtc(filtro.de)));
  }
  if (filtro.ate !== undefined) {
    condicoes.push(lt(lancamentosFinanceiros.criadoEm, inicioDoDiaSeguinteBrasiliaUtc(filtro.ate)));
  }
  return condicoes;
}

export async function obterResumo(db: Db, filtro: FiltroFinanceiroInput) {
  const condicoes = condicoesDoPeriodo(filtro);

  const [linha] = await db
    .select({ totalCentavos: sum(lancamentosFinanceiros.valorCentavos) })
    .from(lancamentosFinanceiros)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined);

  return {
    totalCentavos: Number(linha?.totalCentavos ?? 0),
    barbeiroId: filtro.barbeiro_id ?? null,
    de: filtro.de ?? null,
    ate: filtro.ate ?? null,
  };
}

export async function listarLancamentos(db: Db, filtro: FiltroFinanceiroInput) {
  const condicoes = condicoesDoPeriodo(filtro);

  return db
    .select()
    .from(lancamentosFinanceiros)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined);
}
