import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { useBarbeiros } from "./hooks/useBarbeiros";
import { LinhaBarbeiro } from "./components/LinhaBarbeiro";
import { PerfilBarbeiro } from "./components/PerfilBarbeiro";
import { Card } from "../../componentes/Card";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import { ErroEstado } from "../../componentes/ErroEstado";
import type { BarbeiroInterno } from "./tipos";

function BotaoVoltarMais() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/painel/mais")}
      className="flex h-11 w-fit items-center gap-1 rounded-lg pr-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      Mais
    </button>
  );
}

/**
 * Admin (vê/gerencia todos os barbeiros) enxerga a lista; sócio comum enxerga direto o
 * próprio perfil — `GET /barbeiros` já vem auto-escopado do back-end (devolve só o
 * próprio registro pra não-admin), então não existe "lista escondida" nenhuma pra quem
 * não é admin: o array que chega aqui já tem 1 item só.
 */
export default function BarbeirosPage() {
  const { socio } = useAuthSocio();
  const souAdmin = socio?.admin ?? false;

  const { data: barbeiros, isLoading, isError, refetch } = useBarbeiros();
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<BarbeiroInterno | null>(null);

  // Sócio comum: perfil próprio direto na tela, sem lista.
  if (!souAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <BotaoVoltarMais />
        <h1 className="text-[28px] font-bold text-text">Meu perfil</h1>

        {isLoading && (
          <Card className="flex items-center gap-3 border-border bg-surface p-4">
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <Skeleton className="h-6 w-32" />
          </Card>
        )}
        {isError && <ErroEstado mensagem="Não foi possível carregar seu perfil." onTentarNovamente={() => refetch()} />}
        {!isLoading && !isError && barbeiros && barbeiros.length === 0 && (
          <EstadoVazio titulo="Nenhum registro de barbeiro encontrado pra esta conta." />
        )}
        {!isLoading && !isError && barbeiros && barbeiros[0] && <PerfilBarbeiro barbeiro={barbeiros[0]} modo="proprio" />}
      </div>
    );
  }

  // Admin com um barbeiro aberto: perfil substitui a lista.
  if (barbeiroSelecionado) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <button
          onClick={() => setBarbeiroSelecionado(null)}
          className="flex h-11 w-fit items-center gap-1 rounded-lg pr-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Barbeiros
        </button>
        <PerfilBarbeiro barbeiro={barbeiroSelecionado} modo="admin" />
      </div>
    );
  }

  // Admin: lista de todos os barbeiros.
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <BotaoVoltarMais />
      <h1 className="text-[28px] font-bold text-text">Barbeiros</h1>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      )}

      {isError && <ErroEstado mensagem="Não foi possível carregar os barbeiros." onTentarNovamente={() => refetch()} />}

      {!isLoading && !isError && barbeiros && barbeiros.length === 0 && <EstadoVazio titulo="Nenhum barbeiro cadastrado." />}

      {!isLoading && !isError && barbeiros && barbeiros.length > 0 && (
        <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
          {barbeiros.map((barbeiro) => (
            <LinhaBarbeiro key={barbeiro.id} barbeiro={barbeiro} onAbrir={() => setBarbeiroSelecionado(barbeiro)} />
          ))}
        </Card>
      )}
    </div>
  );
}
