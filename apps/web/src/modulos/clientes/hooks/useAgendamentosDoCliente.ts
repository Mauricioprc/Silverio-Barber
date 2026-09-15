import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { AgendamentoDoCliente } from "../tipos";

export function useAgendamentosDoCliente(clienteId: number | null) {
  return useQuery({
    queryKey: ["painel", "clientes", clienteId, "agendamentos"],
    queryFn: async () => {
      const { agendamentos } = await apiFetch<{ agendamentos: AgendamentoDoCliente[]; total: number }>(
        `/clientes/${clienteId}/agendamentos?limite=20`
      );
      return agendamentos;
    },
    enabled: clienteId !== null,
  });
}
