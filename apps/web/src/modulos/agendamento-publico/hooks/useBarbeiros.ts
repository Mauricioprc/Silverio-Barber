import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Barbeiro } from "../tipos";

export function useBarbeiros() {
  return useQuery({
    queryKey: ["publico", "barbeiros"],
    queryFn: async () => {
      const { barbeiros } = await apiFetch<{ barbeiros: Barbeiro[] }>("/publico/barbeiros");
      return barbeiros;
    },
    staleTime: 5 * 60_000,
  });
}
