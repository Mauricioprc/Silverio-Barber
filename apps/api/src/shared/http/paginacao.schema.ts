import { z } from "zod";

/**
 * Paginação por `limite`/`offset` — correção pós-auditoria (ver
 * `07-auditoria-geral-backend.md`, item 2.4): `listarClientes`
 * (`clientes.service.ts`) e `listarLancamentos` (`financeiro.service.ts`) traziam a
 * tabela inteira, sem limite algum. Com o volume estimado do negócio (>1.000
 * agendamentos/mês), essas duas consultas só cresceriam, batendo desnecessariamente no
 * teto de CU-horas da Neon (já apertado, ver `CHECKLIST-DEPLOY.md`).
 *
 * `limite` tem teto de 100 (defesa contra um cliente da API pedir tudo de uma vez só
 * trocando o parâmetro) e padrão de 50 — generoso o suficiente pro uso normal do balcão
 * (poucas dezenas de resultados por tela), sem abrir mão do limite.
 */
export const paginacaoQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginacaoInput = z.infer<typeof paginacaoQuerySchema>;
