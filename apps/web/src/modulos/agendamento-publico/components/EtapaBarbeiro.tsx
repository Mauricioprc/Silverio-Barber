import { useBarbeiros } from "../hooks/useBarbeiros";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import type { Barbeiro } from "../tipos";

export function EtapaBarbeiro({ onEscolher }: { onEscolher: (barbeiro: Barbeiro) => void }) {
  const { data: barbeiros, isLoading, isError } = useBarbeiros();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <EstadoVazio titulo="Não foi possível carregar os barbeiros." descricao="Tente novamente em instantes." />;
  }

  if (!barbeiros || barbeiros.length === 0) {
    return <EstadoVazio titulo="Nenhum barbeiro disponível no momento." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {barbeiros.map((barbeiro) => (
        <button
          key={barbeiro.id}
          onClick={() => onEscolher(barbeiro)}
          className="rounded border border-base-700 bg-base-900 p-4 text-left font-medium transition-colors hover:border-destaque-500"
        >
          {barbeiro.nome}
        </button>
      ))}
    </div>
  );
}
