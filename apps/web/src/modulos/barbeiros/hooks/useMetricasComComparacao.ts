import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import { calcularIntervaloMes, calcularReferencia, calcularVariacao, mesAtual } from "../../../lib/periodo";
import type { ResumoFinanceiro } from "../../financeiro/tipos";

async function metricasDoPeriodo(barbeiroId: number, de: string, ate: string) {
  const [resumo, lancamentos] = await Promise.all([
    apiFetch<ResumoFinanceiro>(`/financeiro/resumo?de=${de}&ate=${ate}&barbeiro_id=${barbeiroId}`),
    apiFetch<{ total: number }>(`/financeiro/lancamentos?de=${de}&ate=${ate}&barbeiro_id=${barbeiroId}&limite=1`),
  ]);
  return { atendimentos: lancamentos.total, faturamentoCentavos: resumo.totalCentavos };
}

/**
 * Métricas do mês + comparação com o mês anterior (front-redesign-fase3-barbeiros.md,
 * item B2.3) — reusa os mesmos endpoints e a mesma função de comparação do Financeiro
 * (`calcularReferencia`/`calcularVariacao`, extraídas pra `lib/periodo.ts`), só que
 * filtradas por este barbeiro nos dois períodos. Nenhum endpoint novo.
 */
export function useMetricasComComparacao(barbeiroId: number) {
  const { ano, mes } = mesAtual();
  const { de, ate } = calcularIntervaloMes(ano, mes);
  const referencia = calcularReferencia("mes", ano, mes);

  return useQuery({
    queryKey: ["painel", "barbeiros", barbeiroId, "metricas-comparacao", de, ate],
    queryFn: async () => {
      const [atual, ref] = await Promise.all([
        metricasDoPeriodo(barbeiroId, de, ate),
        metricasDoPeriodo(barbeiroId, referencia.de, referencia.ate),
      ]);
      return {
        atendimentos: atual.atendimentos,
        faturamentoCentavos: atual.faturamentoCentavos,
        variacaoAtendimentos: calcularVariacao(atual.atendimentos, ref.atendimentos),
        variacaoFaturamento: calcularVariacao(atual.faturamentoCentavos, ref.faturamentoCentavos),
        rotuloComparacao: referencia.rotulo,
      };
    },
    staleTime: 60_000,
  });
}
