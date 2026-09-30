import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { FaixaDisponibilidade } from "../tipos";

export function useDisponibilidadeBarbeiro(barbeiroId: number) {
  return useQuery({
    queryKey: ["painel", "barbeiros", barbeiroId, "disponibilidade"],
    queryFn: async () => {
      const { disponibilidade } = await apiFetch<{ disponibilidade: FaixaDisponibilidade[] }>(
        `/barbeiros/${barbeiroId}/disponibilidade`
      );
      return disponibilidade;
    },
    staleTime: 60_000,
  });
}

/** `PUT /barbeiros/:id/disponibilidade` — substitui a semana inteira pela lista enviada. */
export function useSalvarDisponibilidade(barbeiroId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      disponibilidade: {
        diaSemana: number;
        horaInicio: string;
        horaFim: string;
        pausaInicio?: string;
        pausaFim?: string;
      }[]
    ) =>
      apiFetch<{ disponibilidade: FaixaDisponibilidade[] }>(`/barbeiros/${barbeiroId}/disponibilidade`, {
        method: "PUT",
        corpo: { disponibilidade },
      }).then((r) => r.disponibilidade),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["painel", "barbeiros", barbeiroId, "disponibilidade"] }),
  });
}
