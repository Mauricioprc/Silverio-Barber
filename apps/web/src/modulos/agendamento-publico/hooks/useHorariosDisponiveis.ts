import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Intervalo } from "../tipos";

/**
 * Parseia "YYYY-MM-DD HH:MM(:SS)" como campos numéricos (nunca via `new Date(string)`
 * direto, que dependeria do fuso do navegador) e usa `Date.UTC` só como relógio auxiliar
 * para somar minutos — os valores de volta são sempre lidos com os métodos `getUTC*`,
 * então nenhum fuso real entra na conta.
 */
function paraRelogioAuxiliar(horarioLocal: string): number {
  const [dataParte, horaParte] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = dataParte.split("-").map(Number);
  const [h, m, s] = horaParte.split(":").map(Number);
  return Date.UTC(ano, mes - 1, dia, h, m, s || 0);
}

function formatarRelogioAuxiliar(timestamp: number): string {
  const data = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${data.getUTCFullYear()}-${pad(data.getUTCMonth() + 1)}-${pad(data.getUTCDate())} ${pad(
    data.getUTCHours()
  )}:${pad(data.getUTCMinutes())}:${pad(data.getUTCSeconds())}`;
}

/**
 * O back-end (`calcularDisponibilidade`) devolve os intervalos livres brutos (ex.: um
 * único bloco "09:00–18:00" se nada estiver ocupado), não horários já fatiados na
 * duração do serviço — fatiar é responsabilidade de UX do front, não recalcula nenhuma
 * regra de negócio (a validação final de conflito continua sendo sempre o back-end em
 * `POST /publico/agendamentos`).
 */
export function fatiarIntervalosDisponiveis(intervalos: Intervalo[], duracaoMinutos: number): Intervalo[] {
  const passoMs = duracaoMinutos * 60_000;
  const slots: Intervalo[] = [];

  for (const intervalo of intervalos) {
    const fimIntervaloMs = paraRelogioAuxiliar(intervalo.fim);
    let inicioSlotMs = paraRelogioAuxiliar(intervalo.inicio);

    while (inicioSlotMs + passoMs <= fimIntervaloMs) {
      slots.push({
        inicio: formatarRelogioAuxiliar(inicioSlotMs),
        fim: formatarRelogioAuxiliar(inicioSlotMs + passoMs),
      });
      inicioSlotMs += passoMs;
    }
  }

  return slots;
}

/**
 * Sem `staleTime` longo de propósito (ver escopo da Fase 2) — disponibilidade muda com
 * frequência, e o React Query já refaz a busca sozinho quando `barbeiroId`/`data` mudam
 * (fazem parte da `queryKey`), sem precisar de nenhum `useEffect` manual.
 */
export function useHorariosDisponiveis(barbeiroId: number | null, data: string | null, duracaoMinutos: number) {
  return useQuery({
    queryKey: ["publico", "disponibilidade", barbeiroId, data],
    queryFn: async () => {
      const { disponibilidade } = await apiFetch<{ disponibilidade: Intervalo[] }>(
        `/publico/disponibilidade?barbeiro_id=${barbeiroId}&data=${data}`
      );
      return disponibilidade;
    },
    select: (intervalos) => fatiarIntervalosDisponiveis(intervalos, duracaoMinutos),
    enabled: barbeiroId !== null && data !== null,
    staleTime: 0,
  });
}
