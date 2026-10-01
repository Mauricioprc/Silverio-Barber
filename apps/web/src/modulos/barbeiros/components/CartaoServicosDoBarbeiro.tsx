import { useState } from "react";
import { ChevronRight, Scissors } from "lucide-react";
import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { useServicosDoBarbeiro } from "../hooks/useServicosDoBarbeiro";
import { SheetMeusServicos } from "./SheetMeusServicos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * "SERVIÇOS" (Fase D2) — resumo do que este barbeiro faz hoje (vínculo ativo + serviço
 * ainda ativo no catálogo); editar de verdade acontece no sheet "Meus serviços".
 */
export function CartaoServicosDoBarbeiro({ barbeiroId }: { barbeiroId: number }) {
  const { data: servicos, isLoading } = useServicosDoBarbeiro(barbeiroId);
  const [sheetAberto, setSheetAberto] = useState(false);

  const feitos = (servicos ?? []).filter((s) => s.vinculado && s.ativoNoCatalogo);

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text-muted">Serviços</p>
      <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
        {isLoading && (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        )}

        {!isLoading && feitos.length === 0 && <p className="p-4 text-sm text-text-muted">Nenhum serviço vinculado.</p>}

        {!isLoading &&
          feitos.map((servico) => (
            <div key={servico.id} className="flex items-center gap-2 px-4 py-3">
              <Scissors className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <p className="flex-1 text-sm text-text">{servico.nome}</p>
              <p className="text-sm text-text-muted">
                {formatarReais(servico.valorCentavos)} · {servico.duracaoMinutos} min
              </p>
            </div>
          ))}

        <button
          onClick={() => setSheetAberto(true)}
          className="flex h-11 w-full items-center gap-1 px-4 text-left text-sm font-medium text-gold-strong transition-colors hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          Editar serviços
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </Card>

      <SheetMeusServicos barbeiroId={barbeiroId} aberto={sheetAberto} onFechar={() => setSheetAberto(false)} />
    </div>
  );
}
