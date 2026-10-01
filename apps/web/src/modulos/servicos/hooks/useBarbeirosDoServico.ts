import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { BarbeiroDoServico } from "../tipos";

/** "Quem faz" este serviço (Fase D2) — só habilita a busca quando há um `servicoId` real. */
export function useBarbeirosDoServico(servicoId: number | undefined) {
  return useQuery({
    queryKey: ["painel", "servicos", servicoId, "barbeiros"],
    queryFn: async () => {
      const { barbeiros } = await apiFetch<{ barbeiros: BarbeiroDoServico[] }>(`/servicos/${servicoId}/barbeiros`);
      return barbeiros;
    },
    enabled: servicoId !== undefined,
  });
}
