/**
 * Reexporta de `shared/disponibilidade/disponibilidade.util.ts` — movido pra lá na Fase
 * D do redesenho, porque a validação de expediente/pausa passou a ser usada também por
 * `agendamentos.service.ts`, não só por este módulo. Mantido aqui pra nenhum import
 * existente precisar mudar.
 */
export * from "../../shared/disponibilidade/disponibilidade.util";
