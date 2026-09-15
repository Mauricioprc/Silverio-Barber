import type { ReactNode } from "react";

type Props = { titulo: string; aberto: boolean; onFechar: () => void; children: ReactNode };

/** Modal de confirmação — usado em ações destrutivas/irreversíveis (ver escopo da Fase 3). */
export function Modal({ titulo, aberto, onFechar, children }: Props) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded border border-base-700 bg-base-900 p-6 shadow-lg"
      >
        <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
