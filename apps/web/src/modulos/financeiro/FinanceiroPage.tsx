import { useState } from "react";
import { useBarbeirosInternos } from "../agenda/hooks/useBarbeirosInternos";
import { useResumoFinanceiro } from "./hooks/useResumoFinanceiro";
import { useLancamentos } from "./hooks/useLancamentos";
import { FiltroPeriodo } from "./components/FiltroPeriodo";
import { CartaoResumo } from "./components/CartaoResumo";
import { ListaLancamentos } from "./components/ListaLancamentos";
import { calcularIntervalo } from "./periodo.util";
import type { Periodo } from "./tipos";

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null);
  const { data: barbeiros } = useBarbeirosInternos();

  const { de, ate } = calcularIntervalo(periodo);
  const { data: resumo, isLoading: carregandoResumo } = useResumoFinanceiro(de, ate, barbeiroId);
  const { data: lancamentos, isLoading: carregandoLancamentos } = useLancamentos(de, ate, barbeiroId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Financeiro</h1>

      <FiltroPeriodo
        periodo={periodo}
        onMudarPeriodo={setPeriodo}
        barbeiroId={barbeiroId}
        onMudarBarbeiro={setBarbeiroId}
        barbeiros={barbeiros ?? []}
      />

      <CartaoResumo totalCentavos={resumo?.totalCentavos} carregando={carregandoResumo} />

      <ListaLancamentos lancamentos={lancamentos} isLoading={carregandoLancamentos} barbeiros={barbeiros ?? []} />
    </div>
  );
}
