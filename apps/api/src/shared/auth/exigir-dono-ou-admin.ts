import type { EscopoAutorizacao } from "../tipos";

/** Mensagem padrão pras rotas que barram acesso a recurso alheio (ver rotas que usam isto). */
export const ERRO_ACESSO_NEGADO = "Você só pode acessar seus próprios dados.";

/**
 * `true` se quem chama é admin (vê/gerencia tudo) ou se `barbeiroId` é o próprio dono do
 * recurso. Usado nas rotas que recebem um id de recurso já existente (ex.: `PUT
 * /barbeiros/:id`, `DELETE /bloqueios/:id`) pra decidir 403 antes de mexer no banco.
 */
export function ehDonoOuAdmin(escopo: EscopoAutorizacao, barbeiroId: number): boolean {
  return escopo.admin || escopo.barbeiroId === barbeiroId;
}

/**
 * Resolve o `barbeiroId` que a consulta deve realmente usar: para admin, respeita o que
 * foi pedido (pode ser `null` = consolidado/todos, onde a rota permitir); para não-admin,
 * ignora o que foi pedido e força sempre o próprio — não dá pra contornar mandando outro
 * id no corpo/query. Usado em rotas de listagem/criação (`GET /agendamentos`, `GET
 * /financeiro/resumo`, `POST /agendamentos` etc.).
 */
export function barbeiroIdForcado(escopo: EscopoAutorizacao, solicitado: number | null): number | null {
  return escopo.admin ? solicitado : escopo.barbeiroId;
}
