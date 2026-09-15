import { useServicos } from "../hooks/useServicos";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import type { Servico } from "../tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EtapaServico({ onEscolher }: { onEscolher: (servico: Servico) => void }) {
  const { data: servicos, isLoading, isError } = useServicos();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <EstadoVazio titulo="Não foi possível carregar os serviços." descricao="Tente novamente em instantes." />;
  }

  if (!servicos || servicos.length === 0) {
    return <EstadoVazio titulo="Nenhum serviço disponível no momento." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {servicos.map((servico) => (
        <button
          key={servico.id}
          onClick={() => onEscolher(servico)}
          className="flex items-center justify-between rounded border border-base-700 bg-base-900 p-4 text-left transition-colors hover:border-destaque-500"
        >
          <div>
            <p className="font-medium">{servico.nome}</p>
            <p className="text-sm text-base-300">{servico.duracaoMinutos} min</p>
          </div>
          <span className="font-semibold text-destaque-400">{formatarReais(servico.valorCentavos)}</span>
        </button>
      ))}
    </div>
  );
}
