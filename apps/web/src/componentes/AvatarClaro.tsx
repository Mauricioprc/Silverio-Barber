function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/**
 * Avatar do redesenho claro (ver front-redesign-fase0-agenda.md) — fundo gold-soft,
 * texto gold-strong. Distinto do `Avatar` escuro, que continua servindo Barbeiros (fora
 * de escopo).
 */
export function AvatarClaro({ nome }: { nome: string }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-gold-strong"
      aria-hidden="true"
    >
      {iniciais(nome)}
    </div>
  );
}
