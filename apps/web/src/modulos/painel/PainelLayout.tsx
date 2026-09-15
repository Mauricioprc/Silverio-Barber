import { NavLink, Outlet } from "react-router-dom";
import { useAuthSocio } from "../../contextos/auth-socio-context";

const ABAS = [
  { to: "/painel", rotulo: "Agenda", fim: true },
  { to: "/painel/financeiro", rotulo: "Financeiro", fim: false },
  { to: "/painel/clientes", rotulo: "Clientes", fim: false },
];

export default function PainelLayout() {
  const { socio, logout } = useAuthSocio();

  return (
    <div className="min-h-screen">
      <header className="border-b border-base-700">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 p-4">
          <nav className="flex gap-4">
            {ABAS.map((aba) => (
              <NavLink
                key={aba.to}
                to={aba.to}
                end={aba.fim}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-destaque-400" : "text-base-300 hover:text-base-50"}`
                }
              >
                {aba.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-base-300">{socio?.nome}</span>
            <button onClick={() => logout()} className="text-sm text-base-300 underline">
              Sair
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
