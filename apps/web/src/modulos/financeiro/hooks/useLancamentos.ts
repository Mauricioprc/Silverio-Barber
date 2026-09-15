import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Lancamento } from "../tipos";

export function useLancamentos(de: string, ate: string, barbeiroId: number | null) {
  return useQuery({
    queryKey: ["painel", "financeiro", "lancamentos", de, ate, barbeiroId],
    queryFn: () =>
      apiFetch<{ lancamentos: Lancamento[]; total: number }>(
        `/financeiro/lancamentos?de=${de}&ate=${ate}${barbeiroId !== null ? `&barbeiro_id=${barbeiroId}` : ""}&limite=50`
      ).then((r) => r.lancamentos),
  });
}
