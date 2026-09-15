import { Card } from "../../../componentes/Card";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import type { BarbeiroInterno } from "../../agenda/tipos";
import type { Lancamento } from "../tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(isoUtc: string): string {
  return new Date(isoUtc).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ListaLancamentos({
  lancamentos,
  isLoading,
  barbeiros,
}: {
  lancamentos: Lancamento[] | undefined;
  isLoading: boolean;
  barbeiros: BarbeiroInterno[];
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!lancamentos || lancamentos.length === 0) {
    return <EstadoVazio titulo="Nenhum lançamento no período." descricao="Conclua um agendamento para gerar um lançamento." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {lancamentos.map((lancamento) => (
        <Card key={lancamento.id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <p>{barbeiros.find((b) => b.id === lancamento.barbeiroId)?.nome ?? "—"}</p>
            <p className="text-base-300">{formatarDataHora(lancamento.criadoEm)}</p>
          </div>
          <span className="font-medium text-destaque-400">{formatarReais(lancamento.valorCentavos)}</span>
        </Card>
      ))}
    </div>
  );
}
