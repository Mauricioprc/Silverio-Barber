import { useState } from "react";
import { useBarbeirosInternos } from "../agenda/hooks/useBarbeirosInternos";
import { useResumoFinanceiro } from "./hooks/useResumoFinanceiro";
import { useLancamentosCompletos } from "./hooks/useLancamentosCompletos";
import { useContagemLancamentos } from "./hooks/useContagemLancamentos";
import { FiltroPeriodo } from "./components/FiltroPeriodo";
import { CartaoResumo } from "./components/CartaoResumo";
import { ListaLancamentos } from "./components/ListaLancamentos";
import { NavegadorMes } from "./components/NavegadorMes";
import { calcularIntervalo, calcularIntervaloMes, calcularReferencia, hojeISO, mesAtual, formatarMesAno } from "./periodo.util";
import type { Periodo } from "./tipos";

export default function FinanceiroPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual());
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null);
  const { data: barbeiros } = useBarbeirosInternos();

  function aoMudarPeriodo(novoPeriodo: Periodo) {
    setPeriodo(novoPeriodo);
    if (novoPeriodo === "mes") setMesSelecionado(mesAtual());
  }

  const { de, ate } =
    periodo === "mes" ? calcularIntervaloMes(mesSelecionado.ano, mesSelecionado.mes) : calcularIntervalo(periodo);
  const referencia = calcularReferencia(periodo, mesSelecionado.ano, mesSelecionado.mes);

  const { data: resumo, isLoading: carregandoResumo } = useResumoFinanceiro(de, ate, barbeiroId);
  const {
    data: lancamentosCompletos,
    isLoading: carregandoLancamentos,
    isError: erroLancamentos,
    refetch: recarregarLancamentos,
  } = useLancamentosCompletos(de, ate, barbeiroId);

  const { data: resumoReferencia } = useResumoFinanceiro(referencia.de, referencia.ate, barbeiroId);
  const { data: contagemReferencia } = useContagemLancamentos(referencia.de, referencia.ate, barbeiroId);

  const incluiHoje = ate === hojeISO();
  const rotuloVazio =
    periodo === "mes"
      ? `Nenhum lançamento em ${formatarMesAno(mesSelecionado.ano, mesSelecionado.mes).toLowerCase()}`
      : "Nenhum lançamento no período.";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-text">Financeiro</h1>

      <FiltroPeriodo
        periodo={periodo}
        onMudarPeriodo={aoMudarPeriodo}
        barbeiroId={barbeiroId}
        onMudarBarbeiro={setBarbeiroId}
        barbeiros={barbeiros ?? []}
      />

      {periodo === "mes" && (
        <NavegadorMes
          ano={mesSelecionado.ano}
          mes={mesSelecionado.mes}
          onMudar={(ano, mes) => setMesSelecionado({ ano, mes })}
        />
      )}

      <CartaoResumo
        totalCentavos={resumo?.totalCentavos}
        totalReferenciaCentavos={resumoReferencia?.totalCentavos}
        atendimentos={lancamentosCompletos?.total}
        atendimentosReferencia={contagemReferencia}
        rotuloComparacao={referencia.rotulo}
        carregando={carregandoResumo || carregandoLancamentos}
      />

      <ListaLancamentos
        lancamentos={lancamentosCompletos?.itens}
        isLoading={carregandoLancamentos}
        isError={erroLancamentos}
        onTentarNovamente={recarregarLancamentos}
        barbeiros={barbeiros ?? []}
        rotuloVazio={rotuloVazio}
        incluiHoje={incluiHoje}
      />
    </div>
  );
}
