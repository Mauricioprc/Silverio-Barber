import { z } from "zod";
import { paginacaoQuerySchema } from "../../shared/http/paginacao.schema";

/**
 * `de`/`ate` e `barbeiro_id` são todos opcionais — sem `barbeiro_id`, o resumo/lista é o
 * consolidado dos dois sócios (decisão de negócio: visão, não repartição — ver seção 2 do
 * `planejamento-geral.md`). Sem `de`/`ate`, não há filtro de período (todos os
 * lançamentos).
 *
 * `limite`/`offset` (correção pós-auditoria — ver `shared/http/paginacao.schema.ts`) só
 * se aplicam à listagem (`listarLancamentos`) — `obterResumo` sempre soma o período
 * inteiro filtrado, paginação não faz sentido pra um total agregado.
 */
export const filtroFinanceiroQuerySchema = z
  .object({
    de: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use o formato "YYYY-MM-DD".')
      .optional(),
    ate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use o formato "YYYY-MM-DD".')
      .optional(),
    barbeiro_id: z.coerce.number().int().positive().optional(),
  })
  .merge(paginacaoQuerySchema);

export type FiltroFinanceiroInput = z.infer<typeof filtroFinanceiroQuerySchema>;
