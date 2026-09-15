import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CartaoResumo({ totalCentavos, carregando }: { totalCentavos: number | undefined; carregando: boolean }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-base-300">Total no período</span>
      {carregando ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <span className="text-3xl font-semibold text-destaque-400">{formatarReais(totalCentavos ?? 0)}</span>
      )}
    </Card>
  );
}
