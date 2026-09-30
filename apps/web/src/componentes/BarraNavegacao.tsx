import type { LucideIcon } from "lucide-react";

export type ItemNavegacao = {
  rotulo: string;
  icone: LucideIcon;
  ativo: boolean;
  onClick: () => void;
};

/**
 * Pílula de navegação inferior clara do redesenho (ver
 * front-redesign-fase0-agenda.md). Componente puramente apresentacional —
 * recebe os itens já resolvidos; a lista de rotas é decidida na etapa
 * "Navegação inferior + página Mais".
 */
export function BarraNavegacao({ itens }: { itens: ItemNavegacao[] }) {
  return (
    <nav
      className="fixed inset-x-4 z-30 flex items-center justify-around rounded-chip border border-border bg-surface px-2 shadow-soft"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))", height: "60px" }}
    >
      {itens.map((item) => {
        const Icone = item.icone;
        return (
          <button
            key={item.rotulo}
            type="button"
            onClick={item.onClick}
            aria-current={item.ativo ? "page" : undefined}
            className="flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span className="relative flex items-center justify-center">
              <Icone
                className={`h-5 w-5 ${item.ativo ? "text-gold-strong" : "text-text-muted"}`}
                aria-hidden="true"
              />
              {item.ativo && <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-gold" aria-hidden="true" />}
            </span>
            <span className={item.ativo ? "text-gold-strong" : "text-text-muted"}>{item.rotulo}</span>
          </button>
        );
      })}
    </nav>
  );
}
