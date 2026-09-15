import { useEffect, useRef, type ReactNode } from "react";

type Props = { titulo: string; aberto: boolean; onFechar: () => void; children: ReactNode };

/**
 * Modal de confirmação — usado em ações destrutivas/irreversíveis (ver escopo da Fase 3).
 * Fecha com `Escape` e move o foco pra dentro ao abrir (achados da revisão de
 * acessibilidade da Fase 5: antes só fechava por clique no fundo, inacessível por
 * teclado).
 */
export function Modal({ titulo, aberto, onFechar, children }: Props) {
  const conteudoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    conteudoRef.current?.focus();

    function aoTeclar(evento: globalThis.KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onFechar}>
      <div
        ref={conteudoRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded border border-base-700 bg-base-900 p-6 shadow-lg outline-none"
      >
        <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
