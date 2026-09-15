import type { Periodo } from "./tipos";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Recorte mínimo decidido para a Fase 4: dia, semana (7 dias corridos) e mês corrente. */
export function calcularIntervalo(periodo: Periodo): { de: string; ate: string } {
  const hoje = hojeISO();
  if (periodo === "dia") return { de: hoje, ate: hoje };
  if (periodo === "semana") return { de: somarDias(hoje, -6), ate: hoje };

  const [ano, mes] = hoje.split("-").map(Number);
  const primeiroDiaDoMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
  return { de: primeiroDiaDoMes, ate: hoje };
}
