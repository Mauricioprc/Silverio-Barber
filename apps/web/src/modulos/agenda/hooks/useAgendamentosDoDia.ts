import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { AgendamentoDoDia } from "../tipos";

export function chaveAgendamentosDoDia(barbeiroId: number | null, data: string) {
  return ["painel", "agendamentos", barbeiroId, data] as const;
}

/**
 * `barbeiro_id` é obrigatório no back-end (`listarAgendamentosQuerySchema`) — não existe
 * "ver todos os barbeiros de uma vez" na API, então a tela sempre filtra por um sócio por
 * vez (ver escopo da Fase 3: "considerando que existem 2 sócios-barbeiros").
 */
export function useAgendamentosDoDia(barbeiroId: number | null, data: string) {
  return useQuery({
    queryKey: chaveAgendamentosDoDia(barbeiroId, data),
    queryFn: async () => {
      const { agendamentos } = await apiFetch<{ agendamentos: AgendamentoDoDia[] }>(
        `/agendamentos?barbeiro_id=${barbeiroId}&data=${data}`
      );
      return agendamentos.sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
    enabled: barbeiroId !== null,
    staleTime: 0,
  });
}

export function useInvalidarAgendamentosDoDia() {
  const queryClient = useQueryClient();
  return (barbeiroId: number | null, data: string) =>
    queryClient.invalidateQueries({ queryKey: chaveAgendamentosDoDia(barbeiroId, data) });
}
