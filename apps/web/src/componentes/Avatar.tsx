function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

const TAMANHOS = {
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-xl",
};

/** Avatar com fallback elegante em iniciais — nenhuma tela do sistema tem foto de barbeiro/cliente hoje. */
export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: keyof typeof TAMANHOS }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-base-600 font-serif font-semibold text-destaque-400 ring-2 ring-destaque-500/30 ${TAMANHOS[tamanho]}`}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </div>
  );
}
