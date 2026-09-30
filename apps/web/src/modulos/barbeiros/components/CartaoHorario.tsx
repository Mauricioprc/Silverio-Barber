import { ChevronRight, Clock, Utensils } from "lucide-react";
import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { agruparDisponibilidade } from "../disponibilidade.util";
import type { FaixaDisponibilidade } from "../tipos";

const MAX_LINHAS = 4;

/**
 * Card-resumo tocável do horário de atendimento (item B2.4) — substitui a listagem dos
 * 7 dias. O card inteiro abre o sheet de edição (SheetHorario, B3).
 */
export function CartaoHorario({
  disponibilidade,
  isLoading,
  onAbrir,
}: {
  disponibilidade: FaixaDisponibilidade[] | undefined;
  isLoading: boolean;
  onAbrir: () => void;
}) {
  if (isLoading || !disponibilidade) {
    return (
      <Card className="flex flex-col gap-2 border-border bg-surface p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
      </Card>
    );
  }

  const grupos = agruparDisponibilidade(disponibilidade);
  const linhas = grupos.length > MAX_LINHAS ? grupos.slice(0, MAX_LINHAS - 1) : grupos;
  const variacoesRestantes = grupos.length > MAX_LINHAS ? grupos.length - (MAX_LINHAS - 1) : 0;

  return (
    <button
      onClick={onAbrir}
      className="flex w-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Horário de atendimento
      </p>

      <div className="flex flex-col gap-1">
        {linhas.map((grupo) => (
          <div key={grupo.diasRotulo}>
            <p className="text-sm text-text">
              <span className="font-medium">{grupo.diasRotulo}</span> · {grupo.horarioRotulo}
            </p>
            {grupo.almocoRotulo && (
              <p className="flex items-center gap-1.5 pl-0.5 text-xs text-text-muted">
                <Utensils className="h-3 w-3 shrink-0" aria-hidden="true" />
                Almoço · {grupo.almocoRotulo}
              </p>
            )}
          </div>
        ))}
        {variacoesRestantes > 0 && <p className="text-sm text-text-muted">+ {variacoesRestantes} variações</p>}
      </div>

      <div className="flex items-center gap-1 border-t border-border pt-3 text-sm font-medium text-gold-strong">
        Editar horários
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </button>
  );
}
