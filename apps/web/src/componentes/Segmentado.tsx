/**
 * Controle segmentado do redesenho claro (ver front-redesign-fase0-agenda.md) —
 * substitui `<select>` nativo quando há poucas opções.
 */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onSelecionar,
  rotulo,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T | null;
  onSelecionar: (valor: T) => void;
  rotulo?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1"
    >
      {opcoes.map((opcao) => {
        const selecionado = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={selecionado}
            onClick={() => onSelecionar(opcao.valor)}
            className={`flex h-11 flex-1 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              selecionado ? "bg-surface text-gold-strong shadow-soft" : "text-text-muted hover:text-text"
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
