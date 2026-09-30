import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Lancamento } from "../tipos";

/**
 * Só a contagem real do período (campo `total` de `/financeiro/lancamentos`, que a API
 * já calcula sem paginar — ver `financeiro.service.ts`) — usado pra comparação
 * (item 6), onde não precisamos da lista, só de "quantos atendimentos". `limite=1` evita
 * baixar itens que seriam descartados.
 */
export function useContagemLancamentos(de: string, ate: string, barbeiroId: number | null) {
  return useQuery({
    queryKey: ["painel", "financeiro", "contagem", de, ate, barbeiroId],
    queryFn: async () => {
      const filtroBarbeiro = barbeiroId !== null ? `&barbeiro_id=${barbeiroId}` : "";
      const pagina = await apiFetch<{ lancamentos: Lancamento[]; total: number }>(
        `/financeiro/lancamentos?de=${de}&ate=${ate}${filtroBarbeiro}&limite=1&offset=0`
      );
      return pagina.total;
    },
  });
}
