function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

const TAMANHOS = {
  md: "h-11 w-11 text-sm", // 44px — Clientes (lista e detalhe)
  lg: "h-12 w-12 text-base", // 48px — lista de Barbeiros
  xl: "h-[72px] w-[72px] text-xl", // 72px — perfil do Barbeiro
};

/**
 * Avatar do redesenho claro (ver front-redesign-fase0-agenda.md) — fundo gold-soft,
 * texto gold-strong. Distinto do `Avatar` escuro, que ainda serve as telas de
 * Barbeiros não tocadas por este componente (fora de escopo até a etapa 3).
 */
export function AvatarClaro({ nome, tamanho = "md" }: { nome: string; tamanho?: keyof typeof TAMANHOS }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gold-soft font-semibold text-gold-strong ${TAMANHOS[tamanho]}`}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </div>
  );
}
