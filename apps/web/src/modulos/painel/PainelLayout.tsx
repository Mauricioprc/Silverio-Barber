import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, IdCard, LogOut, Menu, Scissors, Users, Wallet } from "lucide-react";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { BarraNavegacao, type ItemNavegacao } from "../../componentes/BarraNavegacao";

const ABAS = [
  { to: "/painel", rotulo: "Agenda", fim: true, Icone: CalendarDays },
  { to: "/painel/barbeiros", rotulo: "Barbeiros", fim: false, Icone: IdCard },
  { to: "/painel/financeiro", rotulo: "Financeiro", fim: false, Icone: Wallet },
  { to: "/painel/clientes", rotulo: "Clientes", fim: false, Icone: Users },
  { to: "/painel/servicos", rotulo: "Serviços", fim: false, Icone: Scissors },
];

// Pílula de mobile do redesenho claro (ver front-redesign-fase0-agenda.md): 4 itens
// (Agenda, Financeiro, Clientes, Mais) — Barbeiros/Serviços migraram pra dentro de
// "Mais". A sidebar de desktop (md+) não muda, continua com os 5 itens.
const ABAS_MOBILE = [
  { to: "/painel", rotulo: "Agenda", fim: true, Icone: CalendarDays },
  { to: "/painel/financeiro", rotulo: "Financeiro", fim: false, Icone: Wallet },
  { to: "/painel/clientes", rotulo: "Clientes", fim: false, Icone: Users },
];
const ROTAS_ABA_MAIS = ["/painel/mais", "/painel/barbeiros", "/painel/servicos"];

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

export default function PainelLayout() {
  const { socio, logout } = useAuthSocio();
  const navigate = useNavigate();
  const location = useLocation();

  const itensNavMobile: ItemNavegacao[] = [
    ...ABAS_MOBILE.map((aba) => ({
      rotulo: aba.rotulo,
      icone: aba.Icone,
      ativo: aba.fim ? location.pathname === aba.to : location.pathname.startsWith(aba.to),
      onClick: () => navigate(aba.to),
    })),
    {
      rotulo: "Mais",
      icone: Menu,
      ativo: ROTAS_ABA_MAIS.some((rota) => location.pathname.startsWith(rota)),
      onClick: () => navigate("/painel/mais"),
    },
  ];

  return (
    <div className="min-h-screen bg-bg md:flex">
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
        {/* Topo leve de mobile (< md): wordmark + ícone abrindo "Mais" (Admin/Sair moraram lá). */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-bg px-4 md:hidden">
          <span className="text-lg font-bold tracking-tight text-text">Silvério</span>
          <button
            onClick={() => navigate("/painel/mais")}
            aria-label="Mais"
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Barra superior de desktop (md+): só o nome do sócio, já que navegação e "Sair" moraram pra sidebar. */}
        <header className="sticky top-0 z-30 hidden justify-end bg-base-900 px-6 py-3 md:flex">
          <span className="text-xs text-white/50">{socio?.nome}</span>
        </header>

        {/* Conteúdo ganha respiro embaixo no mobile pra barra flutuante não cobrir nada. */}
        <div className="pb-24 md:pb-0">
          <Outlet />
        </div>

        {/* Pílula flutuante clara de mobile (< md), acima da safe area. */}
        <div className="md:hidden">
          <BarraNavegacao itens={itensNavMobile} />
        </div>
      </div>
    </div>
  );
}
