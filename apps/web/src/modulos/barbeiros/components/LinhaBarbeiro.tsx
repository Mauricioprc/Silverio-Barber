import { ChevronRight } from "lucide-react";
import { AvatarClaro } from "../../../componentes/AvatarClaro";
import { Skeleton } from "../../../componentes/Skeleton";
import { useMetricasBarbeiro } from "../hooks/useMetricasBarbeiro";
import type { BarbeiroInterno } from "../tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Linha da lista de Barbeiros (item B1 do redesenho) — a linha inteira é o link pro
 * perfil, sem botão "Ver perfil" separado. Sem comparação com o mês anterior aqui (só
 * o perfil, B2, recebe isso) — mesmos dados de hoje (`useMetricasBarbeiro`, mês
 * corrente).
 */
export function LinhaBarbeiro({ barbeiro, onAbrir }: { barbeiro: BarbeiroInterno; onAbrir: () => void }) {
  const { data: metricas, isLoading } = useMetricasBarbeiro(barbeiro.id, true);

  return (
    <button
      onClick={onAbrir}
      className="flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
    >
      <AvatarClaro nome={barbeiro.nome} tamanho="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-text">{barbeiro.nome}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-32" />
        ) : (
          <p className="truncate text-sm text-text-muted">
            {metricas?.atendimentos ?? 0} atend. · {formatarReais(metricas?.faturamentoCentavos ?? 0)} no mês
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}
