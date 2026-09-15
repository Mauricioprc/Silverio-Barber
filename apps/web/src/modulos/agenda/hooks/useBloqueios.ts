import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../../lib/api-client";
import type { Bloqueio } from "../tipos";

export function useBloqueios(barbeiroId: number | null) {
  return useQuery({
    queryKey: ["painel", "bloqueios", barbeiroId],
    queryFn: async () => {
      const { bloqueios } = await apiFetch<{ bloqueios: Bloqueio[] }>(
        barbeiroId !== null ? `/bloqueios?barbeiro_id=${barbeiroId}` : "/bloqueios"
      );
      return bloqueios;
    },
    enabled: barbeiroId !== null,
  });
}

type CriarBloqueioInput = { barbeiroId: number; inicio: string; fim: string; motivo?: string };

export function useCriarBloqueio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: CriarBloqueioInput) =>
      apiFetch<{ bloqueio: Bloqueio }>("/bloqueios", { method: "POST", corpo: dados }).then((r) => r.bloqueio),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel", "bloqueios"] }),
  });
}

export function useRemoverBloqueio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ bloqueio: Bloqueio }>(`/bloqueios/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel", "bloqueios"] }),
  });
}

export function conflitoDeHorarioBloqueio(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 409;
}
