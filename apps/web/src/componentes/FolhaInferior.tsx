import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
  /** Ação principal fixa no rodapé do sheet (não rola com o conteúdo). */
  rodape?: ReactNode;
};

/**
 * Bottom sheet claro do redesenho (ver front-redesign-fase0-agenda.md) — usado
 * em fluxos novos como "Novo agendamento". Distinto do `PainelLateral` escuro,
 * que continua servindo as telas ainda não redesenhadas.
 */
export function FolhaInferior({ titulo, aberto, onFechar, children, rodape }: Props) {
  const conteudoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    conteudoRef.current?.focus();
    document.body.style.overflow = "hidden";

    function aoTeclar(evento: globalThis.KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = "";
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onFechar}>
      <div
        ref={conteudoRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(evento) => evento.stopPropagation()}
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[88vh] flex-col rounded-t-sheet border-t border-border bg-surface pt-2 shadow-premium outline-none"
      >
        <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-2">
          <h2 className="text-lg font-semibold text-text">{titulo}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
        {rodape && (
          <div className="shrink-0 border-t border-border bg-surface px-4 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
