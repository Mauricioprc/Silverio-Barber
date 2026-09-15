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
        className="rounded border border-base-700 px-3 py-2 hover:border-destaque-500"
      >
        ←
      </button>
      <span className="min-w-[6.5rem] text-center font-medium">{formatarExibicao(data)}</span>
      <button
        onClick={() => onMudar(somarDias(data, 1))}
        aria-label="Próximo dia"
        className="rounded border border-base-700 px-3 py-2 hover:border-destaque-500"
      >
        →
      </button>
      {data !== hojeISO() && (
        <button onClick={() => onMudar(hojeISO())} className="text-sm text-destaque-400 underline">
          Hoje
        </button>
      )}
    </div>
  );
}

export { hojeISO };
