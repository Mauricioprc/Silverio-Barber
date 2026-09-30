/**
 * Switch do redesenho claro — usado no modo "por dia" do horário de atendimento
 * (front-redesign-fase3-barbeiros.md, item B3) no lugar do checkbox antigo, mesmo
 * estado booleano. Alvo de toque 44×28 (maior que o trilho visual, comum em switches).
 */
export function Switch({
  ligado,
  onMudar,
  rotulo,
}: {
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onMudar(!ligado)}
      className={`relative flex h-11 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        ligado ? "bg-gold" : "bg-surface-2"
      }`}
    >
      <span
        className={`absolute h-6 w-6 rounded-full bg-surface shadow-soft transition-transform ${
          ligado ? "translate-x-[26px]" : "translate-x-[6px]"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
