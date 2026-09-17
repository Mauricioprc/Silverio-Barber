import { ChevronLeft, ChevronRight } from "lucide-react";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return d.toISOString().slice(0, 10);
}

function formatarExibicao(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function SeletorData({ data, onMudar }: { data: string; onMudar: (data: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onMudar(somarDias(data, -1))}
        aria-label="Dia anterior"
        className="rounded border border-base-500 bg-base-700 p-2 text-base-300 transition-colors hover:border-destaque-500/60 hover:text-base-50"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-[6.5rem] text-center font-medium text-base-50">{formatarExibicao(data)}</span>
      <button
        onClick={() => onMudar(somarDias(data, 1))}
        aria-label="Próximo dia"
        className="rounded border border-base-500 bg-base-700 p-2 text-base-300 transition-colors hover:border-destaque-500/60 hover:text-base-50"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {data !== hojeISO() && (
        <button
          onClick={() => onMudar(hojeISO())}
          className="rounded px-2 py-1 text-sm font-medium text-destaque-600 transition-colors hover:bg-destaque-500/10"
        >
          Hoje
        </button>
      )}
    </div>
  );
}

export { hojeISO };
