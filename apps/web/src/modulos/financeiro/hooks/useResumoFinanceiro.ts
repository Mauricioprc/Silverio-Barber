import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { ResumoFinanceiro } from "../tipos";

export function useResumoFinanceiro(de: string, ate: string, barbeiroId: number | null) {
  return useQuery({
    queryKey: ["painel", "financeiro", "resumo", de, ate, barbeiroId],
    queryFn: () =>
      apiFetch<ResumoFinanceiro>(
        `/financeiro/resumo?de=${de}&ate=${ate}${barbeiroId !== null ? `&barbeiro_id=${barbeiroId}` : ""}`
      ),
  });
}
