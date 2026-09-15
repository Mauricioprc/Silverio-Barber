import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { ServicoInterno } from "../tipos";

export function useServicosInternos() {
  return useQuery({
    queryKey: ["painel", "servicos"],
    queryFn: async () => {
      const { servicos } = await apiFetch<{ servicos: ServicoInterno[] }>("/servicos?ativos=1");
      return servicos;
    },
    staleTime: 5 * 60_000,
  });
}
