import { ChevronRight, Plus } from "lucide-react";
import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { formatarRotuloAusencia, formatarSubtituloAusencia } from "../ausencias.util";
import type { Bloqueio } from "../../agenda/tipos";

type Props = {
  ausencias: Bloqueio[] | undefined;
  isLoading: boolean;
  onAbrirNova: () => void;
  onAbrirExistente: (ausencia: Bloqueio) => void;
};

/**
 * "Ausências programadas" (item C do redesenho) — só futuras/em andamento (as passadas
 * não aparecem, já filtradas em `useAusenciasBarbeiro`), ordem cronológica.
 */
export function CartaoAusencias({ ausencias, isLoading, onAbrirNova, onAbrirExistente }: Props) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-2 border-border bg-surface p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
      </Card>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-muted">Ausências programadas</p>
      <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
        {ausencias && ausencias.length === 0 && (
          <p className="p-4 text-sm text-text-muted">Nenhuma ausência programada.</p>
        )}

        {ausencias?.map((ausencia) => {
          const subtitulo = formatarSubtituloAusencia(ausencia);
          return (
            <button
              key={ausencia.id}
              onClick={() => onAbrirExistente(ausencia)}
              className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{formatarRotuloAusencia(ausencia)}</p>
                {subtitulo && <p className="text-sm text-text-muted">{subtitulo}</p>}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </button>
          );
        })}

        <button
          onClick={onAbrirNova}
          className="flex h-14 w-full items-center gap-2 px-4 text-left text-sm font-medium text-gold-strong transition-colors hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar ausência
        </button>
      </Card>
    </div>
  );
}
