import { useState } from "react";
import { useHorariosDisponiveis } from "../hooks/useHorariosDisponiveis";
import { Skeleton } from "../../../componentes/Skeleton";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import { Input } from "../../../componentes/Input";
import type { Intervalo } from "../tipos";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function horaCurta(horarioLocal: string): string {
  return horarioLocal.slice(11, 16);
}

type Props = {
  barbeiroId: number;
  dataInicial: string | null;
  duracaoMinutos: number;
  onEscolher: (data: string, horario: Intervalo) => void;
};

export function EtapaHorario({ barbeiroId, dataInicial, duracaoMinutos, onEscolher }: Props) {
  const [data, setData] = useState(dataInicial ?? hojeISO());
  const { data: horarios, isLoading, isError } = useHorariosDisponiveis(barbeiroId, data, duracaoMinutos);

  return (
    <div className="flex flex-col gap-4">
      <Input
        rotulo="Data"
        type="date"
        min={hojeISO()}
        value={data}
        onChange={(e) => setData(e.target.value)}
      />

      {isLoading && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <EstadoVazio titulo="Não foi possível carregar os horários." descricao="Tente novamente em instantes." />
      )}

      {!isLoading && !isError && horarios && horarios.length === 0 && (
        <EstadoVazio titulo="Nenhum horário disponível nesse dia." descricao="Tente outra data." />
      )}

      {!isLoading && !isError && horarios && horarios.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {horarios.map((horario) => (
            <button
              key={horario.inicio}
              onClick={() => onEscolher(data, horario)}
              className="rounded border border-base-700 bg-base-900 py-2 text-sm transition-colors hover:border-destaque-500"
            >
              {horaCurta(horario.inicio)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
