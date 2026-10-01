import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Barbeiro } from "../tipos";

/**
 * `servicoId` (Fase D2) — o fluxo público é serviço → barbeiro, então aqui já restringe
 * a quem atende o serviço escolhido na etapa anterior (ver `publico.service.ts`,
 * `listarBarbeirosPublicos`, back-end da Fase D).
 */
export function useBarbeiros(servicoId: number) {
  return useQuery({
    queryKey: ["publico", "barbeiros", servicoId],
    queryFn: async () => {
      const { barbeiros } = await apiFetch<{ barbeiros: Barbeiro[] }>(`/publico/barbeiros?servico_id=${servicoId}`);
      return barbeiros;
    },
    staleTime: 5 * 60_000,
  });
}
