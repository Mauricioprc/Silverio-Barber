import { ChevronLeft, ChevronRight } from "lucide-react";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return d.toISOString().slice(0, 10);
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatarExibicao(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${dia} ${MESES[mes - 1]}`;
}

export function SeletorData({ data, onMudar }: { data: string; onMudar: (data: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onMudar(somarDias(data, -1))}
        aria-label="Dia anterior"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-[7.5rem] text-center text-base font-semibold text-text">{formatarExibicao(data)}</span>
      <button
        onClick={() => onMudar(somarDias(data, 1))}
        aria-label="Próximo dia"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {data !== hojeISO() && (
        <button
          onClick={() => onMudar(hojeISO())}
          className="ml-1 flex h-11 items-center rounded-lg px-2 text-sm font-medium text-gold-strong transition-colors hover:bg-gold-soft"
        >
          Hoje
        </button>
      )}
    </div>
  );
}

export { hojeISO };
