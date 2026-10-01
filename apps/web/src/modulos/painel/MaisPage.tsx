import { ChevronRight, IdCard, LogOut, Scissors, User, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthSocio } from "../../contextos/auth-socio-context";

function LinhaMais({ icone: Icone, rotulo, onClick }: { icone: LucideIcon; rotulo: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 text-left text-text transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <Icone className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
      <span className="flex-1 font-medium">{rotulo}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}

/** Linha só informativa (nome do sócio logado) — sem link, não é uma ação. */
function LinhaInfo({ icone: Icone, rotulo }: { icone: LucideIcon; rotulo: string }) {
  return (
    <div className="flex h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 text-text-muted">
      <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="flex-1 font-medium">{rotulo}</span>
    </div>
  );
}

/**
 * Página "Mais" do redesenho claro (ver front-redesign-fase0-agenda.md) —
 * concentra os acessos que saíram do topo/nav: Barbeiros, Serviços, e no
 * fim Admin (nome do sócio) + Sair. Lista de links pras rotas já
 * existentes, sem lógica nova. Bloqueios saiu daqui — o mesmo conceito já
 * vive em "Ausências" no perfil do barbeiro, sem uma tela paralela.
 */
export default function MaisPage() {
  const navigate = useNavigate();
  const { socio, logout } = useAuthSocio();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-4">
      <LinhaMais icone={IdCard} rotulo="Barbeiros" onClick={() => navigate("/painel/barbeiros")} />
      <LinhaMais icone={Scissors} rotulo="Serviços" onClick={() => navigate("/painel/servicos")} />

      <div className="mt-4 h-px bg-border" aria-hidden="true" />

      <LinhaInfo icone={User} rotulo={socio?.nome ?? "Admin"} />
      <LinhaMais icone={LogOut} rotulo="Sair" onClick={() => logout()} />
    </div>
  );
}
