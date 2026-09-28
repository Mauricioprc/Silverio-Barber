import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { BarbeiroInterno } from "../tipos";

/** Prefixo compartilhado com `agenda/hooks/useBarbeirosInternos.ts` — invalidar por aqui atualiza os dois. */
const CHAVE_QUERY = ["painel", "barbeiros"] as const;

export function useAlternarAtivoBarbeiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      apiFetch<{ barbeiro: BarbeiroInterno }>(`/barbeiros/${id}`, { method: "PUT", corpo: { ativo } }).then(
        (r) => r.barbeiro
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY }),
  });
}

/**
 * Edita o nome de exibição — é como o admin renomeia outro barbeiro (a própria conta
 * também pode usar isto, ou `PUT /auth/me`; tanto faz, os dois caem na mesma coluna).
 */
export function useEditarNomeBarbeiro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) =>
      apiFetch<{ barbeiro: BarbeiroInterno }>(`/barbeiros/${id}`, { method: "PUT", corpo: { nome } }).then(
        (r) => r.barbeiro
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY }),
  });
}
