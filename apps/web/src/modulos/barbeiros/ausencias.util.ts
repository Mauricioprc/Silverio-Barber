import { formatarDataCurta } from "../../lib/periodo";
import type { Bloqueio } from "../agenda/tipos";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function diaDaSemana(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

function somarDiasData(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function horaCurta(horarioLocal: string): string {
  return horarioLocal.slice(11, 16);
}

/**
 * "Dia inteiro" é criado sempre como meia-noite a meia-noite (ver useAusencias.ts —
 * `fim` exclusivo, meia-noite do dia seguinte ao último dia). Detecta isso pelos dois
 * horários batendo com meia-noite, sem precisar de um campo separado no banco.
 */
export function ehDiaInteiro(bloqueio: Bloqueio): boolean {
  return bloqueio.inicio.slice(11, 19) === "00:00:00" && bloqueio.fim.slice(11, 19) === "00:00:00";
}

/** Último dia realmente coberto — `fim` é meia-noite do dia seguinte quando "dia inteiro". */
function dataFinalExibida(bloqueio: Bloqueio): string {
  const dataFim = bloqueio.fim.slice(0, 10);
  return ehDiaInteiro(bloqueio) ? somarDiasData(dataFim, -1) : dataFim;
}

export function formatarRotuloAusencia(bloqueio: Bloqueio): string {
  const dataInicio = bloqueio.inicio.slice(0, 10);
  const dataFim = dataFinalExibida(bloqueio);
  const diaInteiro = ehDiaInteiro(bloqueio);

  if (dataInicio !== dataFim) {
    // Período de vários dias — sem dia da semana, só as datas (ex.: "10 a 20 nov").
    return `${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}`;
  }

  const base = `${diaDaSemana(dataInicio)}, ${formatarDataCurta(dataInicio)}`;
  return diaInteiro ? base : `${base} · ${horaCurta(bloqueio.inicio)}–${horaCurta(bloqueio.fim)}`;
}

/** Segunda linha do card: motivo se houver; senão "Dia inteiro" só quando fizer sentido (bloqueio de dia(s) cheio(s) sem motivo). */
export function formatarSubtituloAusencia(bloqueio: Bloqueio): string | null {
  if (bloqueio.motivo) return bloqueio.motivo;
  return ehDiaInteiro(bloqueio) ? "Dia inteiro" : null;
}
