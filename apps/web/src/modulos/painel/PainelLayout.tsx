import { NavLink, Outlet } from "react-router-dom";
import { CalendarDays, LogOut, Scissors, Users, Wallet } from "lucide-react";
import { useAuthSocio } from "../../contextos/auth-socio-context";

const ABAS = [
  { to: "/painel", rotulo: "Agenda", fim: true, Icone: CalendarDays },
  { to: "/painel/financeiro", rotulo: "Financeiro", fim: false, Icone: Wallet },
  { to: "/painel/clientes", rotulo: "Clientes", fim: false, Icone: Users },
  { to: "/painel/servicos", rotulo: "Serviços", fim: false, Icone: Scissors },
];

/** Ícone com tooltip que só aparece no hover — usado na sidebar de desktop (`md:` +), onde não há espaço pro rótulo ao lado. */
function ItemSidebar({ to, fim, rotulo, Icone }: (typeof ABAS)[number]) {
  return (
    <NavLink
      to={to}
      end={fim}
      className={({ isActive }) =>
        `group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
          isActive ? "bg-destaque-500 text-base-900" : "text-white/60 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icone className="h-5 w-5" aria-hidden="true" />
      <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-base-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-premium transition-opacity group-hover:opacity-100">
        {rotulo}
      </span>
    </NavLink>
  );
}

/** Item da barra inferior de mobile — ícone + rótulo sempre visíveis (touch não tem hover pra depender de tooltip). */
function ItemBarraInferior({ to, fim, rotulo, Icone }: (typeof ABAS)[number]) {
  return (
    <NavLink
      to={to}
      end={fim}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
          isActive ? "text-destaque-500" : "text-white/60"
        }`
      }
    >
      <Icone className="h-5 w-5" aria-hidden="true" />
      {rotulo}
    </NavLink>
  );
}

export default function PainelLayout() {
  const { socio, logout } = useAuthSocio();

  return (
    <div className="min-h-screen bg-base-100 md:flex">
      {/* Sidebar de ícones — só em telas largas (md+); no celular vira a pílula do header abaixo. */}
      <aside className="hidden shrink-0 flex-col items-center gap-1 bg-base-900 py-4 md:flex md:w-16">
        <span className="mb-4 font-serif text-lg font-semibold text-white" aria-hidden="true">
          S
        </span>
        <nav className="flex flex-col gap-1">
          {ABAS.map((aba) => (
            <ItemSidebar key={aba.to} {...aba} />
          ))}
        </nav>
        <div className="flex-1" />
        <div className="group relative flex flex-col items-center">
          <button
            onClick={() => logout()}
            aria-label="Sair"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-destaque-400"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-base-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-premium transition-opacity group-hover:opacity-100">
            Sair
          </span>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Header mobile (< md): só logo + sócio + sair — a navegação principal foi pra barra inferior, mais alcançável com o polegar. */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-base-900 p-4 md:hidden">
          <span className="font-serif text-lg font-semibold tracking-wide text-white">Silvério</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">{socio?.nome}</span>
            <button
              onClick={() => logout()}
              aria-label="Sair"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-white/70 transition-colors hover:text-destaque-400"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </header>

        {/* Barra superior de desktop (md+): só o nome do sócio, já que navegação e "Sair" moraram pra sidebar. */}
        <header className="sticky top-0 z-30 hidden justify-end bg-base-900 px-6 py-3 md:flex">
          <span className="text-xs text-white/50">{socio?.nome}</span>
        </header>

        {/* Conteúdo ganha respiro embaixo no mobile pra barra inferior fixa não cobrir nada. */}
        <div className="pb-20 md:pb-0">
          <Outlet />
        </div>

        {/* Barra inferior de mobile (< md): ações principais de navegação ao alcance do polegar. */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-base-900 pb-[env(safe-area-inset-bottom)] md:hidden">
          {ABAS.map((aba) => (
            <ItemBarraInferior key={aba.to} {...aba} />
          ))}
        </nav>
      </div>
    </div>
  );
}
