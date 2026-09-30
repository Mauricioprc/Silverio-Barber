import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { LinhaComparacao } from "../../../componentes/LinhaComparacao";
import { calcularVariacao } from "../periodo.util";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  totalCentavos: number | undefined;
  totalReferenciaCentavos: number | undefined;
  atendimentos: number | undefined;
  atendimentosReferencia: number | undefined;
  rotuloComparacao: string;
  carregando: boolean;
};

/**
 * Nunca dourado em número (regra 4 do prompt do redesign): total e métricas usam a cor
 * de texto principal, dourado fica só nos elementos de destaque (chip, botão).
 */
export function CartaoResumo({
  totalCentavos,
  totalReferenciaCentavos,
  atendimentos,
  atendimentosReferencia,
  rotuloComparacao,
  carregando,
}: Props) {
  if (carregando) {
    return (
      <Card className="flex flex-col gap-3 border-border bg-surface p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-40" />
        <div className="flex gap-4 border-t border-border pt-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </Card>
    );
  }

  const total = totalCentavos ?? 0;
  const variacaoTotal =
    totalReferenciaCentavos !== undefined ? calcularVariacao(total, totalReferenciaCentavos) : null;

  const qtd = atendimentos ?? 0;
  const variacaoAtendimentos =
    atendimentosReferencia !== undefined ? calcularVariacao(qtd, atendimentosReferencia) : null;

  const ticketMedio = qtd > 0 ? formatarReais(total / qtd) : "—";

  return (
    <Card className="flex flex-col gap-1 border-border bg-surface p-4">
      <span className="text-sm text-text-muted">Total no período</span>
      <span className="text-[36px] font-bold leading-tight text-text">{formatarReais(total)}</span>
      {variacaoTotal && <LinhaComparacao variacao={variacaoTotal} rotulo={rotuloComparacao} tamanho="sm" />}

      <div className="mt-3 flex gap-4 border-t border-border pt-3">
        <div className="flex-1">
          <span className="text-sm text-text-muted">Atendimentos</span>
          <p className="text-lg font-semibold text-text">{qtd}</p>
          {variacaoAtendimentos && <LinhaComparacao variacao={variacaoAtendimentos} rotulo={rotuloComparacao} tamanho="xs" />}
        </div>
        <div className="flex-1">
          <span className="text-sm text-text-muted">Ticket médio</span>
          <p className="text-lg font-semibold text-text">{ticketMedio}</p>
        </div>
      </div>
    </Card>
  );
}
