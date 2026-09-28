import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { BarbeiroInterno } from "../tipos";

/** Lista ativos e inativos — a tela de gestão precisa mostrar os desativados para permitir reativar. */
export function useBarbeiros() {
  return useQuery({
    queryKey: ["painel", "barbeiros", "todos"],
    queryFn: async () => {
      const { barbeiros } = await apiFetch<{ barbeiros: BarbeiroInterno[] }>("/barbeiros");
      return barbeiros;
    },
    staleTime: 5 * 60_000,
  });
}
