/**
 * A aplicação opera no horário de Brasília (fuso do estabelecimento — ver
 * `00-arquitetura-e-convencoes.md`/README, seção de horários sem fuso). Brasília é
 * UTC-3 fixo: o Brasil aboliu o horário de verão em 2019, então não há offset variável
 * ao longo do ano para calcular aqui. Usado por `financeiro` (filtro `de`/`ate`) e
 * `lembretes` (calcular "amanhã" em Brasília) — por isso vive em `shared/`.
 *
 * Diferente das tabelas de agenda (`agendamentos`/`bloqueios_agenda`/`ocupacoes_barbeiro`,
 * que gravam horário local "naive", sem timezone — ver `agendamentos/data.util.ts`),
 * colunas `criado_em` são instantes reais (`timestamp with time zone`, `defaultNow()`).
 * Por isso conversões entre "data no calendário de Brasília" e "instante UTC" passam por
 * aqui, explicitamente — meia-noite em Brasília é 03:00 UTC, não 00:00 UTC.
 */
const OFFSET_BRASILIA_HORAS = 3; // Brasília = UTC-3 ⇒ soma 3h para chegar em UTC.

/** Início (00:00 em Brasília) de `data` ("YYYY-MM-DD"), como instante UTC. */
export function inicioDoDiaBrasiliaUtc(data: string): Date {
  const dia = new Date(`${data}T00:00:00Z`);
  dia.setUTCHours(dia.getUTCHours() + OFFSET_BRASILIA_HORAS);
  return dia;
}

/** Início (00:00 em Brasília) do dia seguinte a `data`, como instante UTC. */
export function inicioDoDiaSeguinteBrasiliaUtc(data: string): Date {
  const dia = inicioDoDiaBrasiliaUtc(data);
  dia.setUTCDate(dia.getUTCDate() + 1);
  return dia;
}

/** Direção inversa: data (YYYY-MM-DD) no calendário de Brasília, a partir de um instante UTC. */
export function dataBrasilia(instanteUtc: Date): string {
  const ajustado = new Date(instanteUtc.getTime() - OFFSET_BRASILIA_HORAS * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ajustado.getUTCFullYear()}-${pad(ajustado.getUTCMonth() + 1)}-${pad(ajustado.getUTCDate())}`;
}
