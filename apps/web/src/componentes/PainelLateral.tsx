import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = { titulo: string; aberto: boolean; onFechar: () => void; children: ReactNode };

/**
 * Drawer escuro — base do novo design system (dark + dourado). Sobe do fundo no mobile,
 * desliza pela direita em telas largas. Reusa o padrão de fechamento por Escape e foco
 * inicial já validado no `Modal` claro (ver revisão de acessibilidade da Fase 5).
 */
export function PainelLateral({ titulo, aberto, onFechar, children }: Props) {
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
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div
        ref={conteudoRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-base-600 bg-base-900 p-6 shadow-premium outline-none md:inset-y-0 md:left-auto md:right-0 md:bottom-0 md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-2xl md:border-l md:border-t-0"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-white">{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
