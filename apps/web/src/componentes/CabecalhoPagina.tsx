import type { ReactNode } from "react";

/**
 * Topo leve do redesenho claro (ver front-redesign-fase0-agenda.md) — wordmark
 * à esquerda, ação opcional à direita (ícone de usuário/menu). Substitui a
 * barra preta com título nas telas migradas.
 */
export function CabecalhoPagina({ acao }: { acao?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4">
      <span className="text-lg font-bold tracking-tight text-text">Silvério</span>
      {acao}
    </header>
  );
}
