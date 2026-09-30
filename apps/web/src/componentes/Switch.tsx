/**
 * Switch do redesenho claro — usado no modo "por dia" do horário de atendimento
 * (front-redesign-fase3-barbeiros.md, item B3) no lugar do checkbox antigo, mesmo
 * estado booleano. Trilho com o mesmo raio de cards/inputs (não pílula — reservada pra
 * chips/badges/botão flutuante). O botão em si mantém 44px de alvo de toque mesmo com o
 * trilho visual menor, via padding centralizando o trilho dentro dele.
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
      className="flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <span
        className={`relative h-6 w-10 rounded-lg transition-colors ${ligado ? "bg-gold" : "bg-surface-2"}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-md bg-surface shadow-soft transition-transform ${
            ligado ? "translate-x-[22px]" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
