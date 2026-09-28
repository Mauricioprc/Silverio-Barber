import { Scissors } from "lucide-react";
import { Avatar } from "../../../componentes/Avatar";
import { useMetricasBarbeiro } from "../hooks/useMetricasBarbeiro";
import type { BarbeiroInterno } from "../tipos";

function PulsoMetrica({ largura }: { largura: string }) {
  return <span className={`mx-auto block h-6 animate-pulse rounded bg-base-600 ${largura}`} aria-hidden="true" />;
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = { barbeiro: BarbeiroInterno; onVerPerfil: () => void };

export function BarbeiroCard({ barbeiro, onVerPerfil }: Props) {
  const { data: metricas, isLoading: carregandoMetricas } = useMetricasBarbeiro(barbeiro.id, true);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-base-600 bg-base-800 p-6 text-center shadow-card transition-colors hover:border-destaque-500/40">
      <Avatar nome={barbeiro.nome} tamanho="lg" />

      <div>
        <p className="font-serif text-lg font-semibold text-white">{barbeiro.nome}</p>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${barbeiro.ativo ? "bg-emerald-400" : "bg-white/30"}`}
            aria-hidden="true"
          />
          <span className={barbeiro.ativo ? "text-emerald-400" : "text-white/50"}>
            {barbeiro.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/40">
        <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
        Barbeiro
      </div>

      <div className="grid w-full grid-cols-2 gap-2 border-t border-base-600 pt-4">
        <div>
          {carregandoMetricas ? (
            <PulsoMetrica largura="w-10" />
          ) : (
            <p className="font-serif text-lg font-semibold text-white">{metricas?.atendimentos ?? 0}</p>
          )}
          <p className="text-[11px] uppercase tracking-wide text-white/40">Atend. no mês</p>
        </div>
        <div>
          {carregandoMetricas ? (
            <PulsoMetrica largura="w-16" />
          ) : (
            <p className="font-serif text-lg font-semibold text-white">
              {formatarReais(metricas?.faturamentoCentavos ?? 0)}
            </p>
          )}
          <p className="text-[11px] uppercase tracking-wide text-white/40">Faturado no mês</p>
        </div>
      </div>

      <button
        onClick={onVerPerfil}
        aria-label={`Ver perfil de ${barbeiro.nome}`}
        className="w-full rounded border border-base-600 py-2 text-sm font-medium text-destaque-400 transition-colors hover:border-destaque-500 hover:bg-destaque-500/10"
      >
        Ver perfil
      </button>
    </div>
  );
}
