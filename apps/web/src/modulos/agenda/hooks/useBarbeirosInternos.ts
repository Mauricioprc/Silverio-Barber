import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { BarbeiroInterno } from "../tipos";

export function useBarbeirosInternos() {
  return useQuery({
    queryKey: ["painel", "barbeiros"],
    queryFn: async () => {
      const { barbeiros } = await apiFetch<{ barbeiros: BarbeiroInterno[] }>("/barbeiros");
      return barbeiros;
    },
    staleTime: 5 * 60_000,
  });
}
