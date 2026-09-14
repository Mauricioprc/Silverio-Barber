/**
 * Aritmética sobre os horários "naive" (sem fuso) gravados em `inicio`/`fim` — ver
 * comentário em `db/schema.ts`. Usa `Date` só como calculadora: a string é interpretada
 * como se fosse UTC (sufixo `Z`), soma-se os minutos, e os componentes são lidos de
 * volta via `getUTC*()` — isso garante que o resultado não sofra nenhuma influência do
 * fuso horário de onde o Worker está rodando (que roda em UTC, mas não custa garantir).
 */

function normalizarSeparador(horario: string): string {
  return horario.length === 16 ? `${horario}:00` : horario; // completa segundos se faltar
}

export function somarMinutos(horarioLocal: string, minutos: number): string {
  const isoUtc = `${normalizarSeparador(horarioLocal).replace(" ", "T")}Z`;
  const data = new Date(isoUtc);
  data.setUTCMinutes(data.getUTCMinutes() + minutos);

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())} ` +
    `${pad(data.getUTCHours())}:${pad(data.getUTCMinutes())}:${pad(data.getUTCSeconds())}`
  );
}

/** Início (00:00:00) do dia seguinte a `dataTexto` ("YYYY-MM-DD"), no mesmo formato de horário local. */
export function inicioDoDiaSeguinte(dataTexto: string): string {
  return somarMinutos(`${dataTexto} 00:00:00`, 24 * 60);
}
