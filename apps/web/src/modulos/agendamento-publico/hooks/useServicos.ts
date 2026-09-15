import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Servico } from "../tipos";

export function useServicos() {
  return useQuery({
    queryKey: ["publico", "servicos"],
    queryFn: async () => {
      const { servicos } = await apiFetch<{ servicos: Servico[] }>("/publico/servicos");
      return servicos;
    },
    staleTime: 5 * 60_000,
  });
}
