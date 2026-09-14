/**
 * A aplicação opera no horário de Brasília (fuso do estabelecimento — ver
 * `00-arquitetura-e-convencoes.md`/README, seção de horários sem fuso). Brasília é
 * UTC-3 fixo: o Brasil aboliu o horário de verão em 2019, então não há offset variável
 * ao longo do ano para calcular aqui.
 *
 * Diferente das tabelas de agenda (`agendamentos`/`bloqueios_agenda`/`ocupacoes_barbeiro`,
 * que gravam horário local "naive", sem timezone — ver `agendamentos/data.util.ts`),
 * `lancamentos_financeiros.criado_em` é um instante real (`timestamp with time zone`,
 * `defaultNow()`). Por isso o filtro `de`/`ate` (datas `YYYY-MM-DD` no calendário local)
 * precisa converter a fronteira do dia para UTC explicitamente — meia-noite em Brasília é
 * 03:00 UTC, não 00:00 UTC.
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
