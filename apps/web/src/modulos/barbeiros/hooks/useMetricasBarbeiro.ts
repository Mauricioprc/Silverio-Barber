import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import { calcularIntervalo } from "../../financeiro/periodo.util";
import type { ResumoFinanceiro } from "../../financeiro/tipos";

/**
 * Métricas reais do mês corrente, derivadas dos mesmos endpoints do módulo Financeiro
 * (nenhum dado inventado): total faturado (`/financeiro/resumo`) e contagem de
 * atendimentos concluídos (`total` de `/financeiro/lancamentos`, sem baixar os itens —
 * `limite=1` só pra pegar a contagem).
 */
export function useMetricasBarbeiro(barbeiroId: number, aberto: boolean) {
  const { de, ate } = calcularIntervalo("mes");

  return useQuery({
    queryKey: ["painel", "barbeiros", barbeiroId, "metricas", de, ate],
    queryFn: async () => {
      const [resumo, lancamentos] = await Promise.all([
        apiFetch<ResumoFinanceiro>(`/financeiro/resumo?de=${de}&ate=${ate}&barbeiro_id=${barbeiroId}`),
        apiFetch<{ total: number }>(`/financeiro/lancamentos?de=${de}&ate=${ate}&barbeiro_id=${barbeiroId}&limite=1`),
      ]);
      return { atendimentos: lancamentos.total, faturamentoCentavos: resumo.totalCentavos };
    },
    enabled: aberto,
    staleTime: 60_000,
  });
}
