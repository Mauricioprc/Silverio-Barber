import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { useDebounce } from "../../lib/useDebounce";
import { useBarbeiros } from "./hooks/useBarbeiros";
import { BarbeiroCard } from "./components/BarbeiroCard";
import { PerfilBarbeiro } from "./components/PerfilBarbeiro";
import type { BarbeiroInterno } from "./tipos";

type Filtro = "todos" | "ativos" | "inativos";

const OPCOES_FILTRO: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "ativos", rotulo: "Ativos" },
  { valor: "inativos", rotulo: "Inativos" },
];

function CardEsqueleto() {
  return (
    <div className="flex animate-pulse flex-col items-center gap-4 rounded-xl border border-base-600 bg-base-800 p-6">
      <div className="h-20 w-20 rounded-full bg-base-600" />
      <div className="h-4 w-28 rounded bg-base-600" />
      <div className="h-3 w-16 rounded bg-base-600" />
      <div className="h-10 w-full rounded bg-base-600" />
    </div>
  );
}

function EstadoCentral({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-base-600 py-12 text-center">
      <p className="font-medium text-white">{titulo}</p>
      {descricao && <p className="text-sm text-white/50">{descricao}</p>}
    </div>
  );
}

/**
 * Admin (vê/gerencia todos os barbeiros) enxerga a grid; sócio comum enxerga direto o
 * próprio perfil — `GET /barbeiros` já vem auto-escopado do back-end (devolve só o
 * próprio registro pra não-admin), então não existe "grid escondida" nenhuma pra quem não
 * é admin: o array que chega aqui já tem 1 item só.
 */
export default function BarbeirosPage() {
  const { socio } = useAuthSocio();
  const souAdmin = socio?.admin ?? false;

  const { data: barbeiros, isLoading, isError } = useBarbeiros();
  const [busca, setBusca] = useState("");
  const buscaComDebounce = useDebounce(busca, 250);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<BarbeiroInterno | null>(null);

  const filtrados = useMemo(() => {
    if (!barbeiros) return [];
    const termo = buscaComDebounce.trim().toLowerCase();
    return barbeiros.filter((barbeiro) => {
      if (filtro === "ativos" && !barbeiro.ativo) return false;
      if (filtro === "inativos" && barbeiro.ativo) return false;
      if (termo && !barbeiro.nome.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [barbeiros, buscaComDebounce, filtro]);

  // Sócio comum: perfil próprio direto na tela, sem grid/busca/filtro (não fazem sentido
  // pra um único registro).
  if (!souAdmin) {
    return (
      <div className="min-h-screen bg-base-900 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-2xl p-4 md:p-8">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-white md:text-3xl">Meu perfil</h1>
            <p className="mt-1 text-sm text-white/50">Seus dados, disponibilidade e acesso.</p>
          </div>

          {isLoading && <CardEsqueleto />}
          {isError && <EstadoCentral titulo="Não foi possível carregar seu perfil." descricao="Tente novamente em instantes." />}
          {!isLoading && !isError && barbeiros && barbeiros.length === 0 && (
            <EstadoCentral titulo="Nenhum registro de barbeiro encontrado pra esta conta." />
          )}
          {!isLoading && !isError && barbeiros && barbeiros[0] && (
            <PerfilBarbeiro barbeiro={barbeiros[0]} modo="proprio" />
          )}
        </div>
      </div>
    );
  }

  // Admin: grid de todos os barbeiros; clicar em "Ver perfil" substitui a grid pelo
  // perfil completo (modo "admin" — nunca é o próprio, admin não tem registro de barbeiro).
  if (barbeiroSelecionado) {
    return (
      <div className="min-h-screen bg-base-900 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-2xl p-4 md:p-8">
          <PerfilBarbeiro barbeiro={barbeiroSelecionado} modo="admin" onVoltar={() => setBarbeiroSelecionado(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-900 pb-24 md:pb-0">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-white md:text-3xl">Barbeiros</h1>
          <p className="mt-1 text-sm text-white/50">Gerencie os profissionais da sua barbearia.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar barbeiro..."
              aria-label="Buscar barbeiro por nome"
              className="w-full appearance-none rounded-lg border border-base-600 bg-base-800 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-destaque-500 focus:ring-1 focus:ring-destaque-500"
            />
          </div>

          <div className="flex gap-1 rounded-lg border border-base-600 bg-base-800 p-1" role="group" aria-label="Filtrar por status">
            {OPCOES_FILTRO.map((opcao) => (
              <button
                key={opcao.valor}
                onClick={() => setFiltro(opcao.valor)}
                aria-pressed={filtro === opcao.valor}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtro === opcao.valor ? "bg-destaque-500 text-base-900" : "text-white/60 hover:text-white"
                }`}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <CardEsqueleto key={i} />
            ))}
          </div>
        )}

        {isError && <EstadoCentral titulo="Não foi possível carregar os barbeiros." descricao="Tente novamente em instantes." />}

        {!isLoading && !isError && barbeiros && barbeiros.length === 0 && (
          <EstadoCentral titulo="Nenhum barbeiro cadastrado." />
        )}

        {!isLoading && !isError && barbeiros && barbeiros.length > 0 && filtrados.length === 0 && (
          <EstadoCentral titulo="Nenhum barbeiro encontrado." descricao="Ajuste a busca ou o filtro selecionado." />
        )}

        {!isLoading && !isError && filtrados.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((barbeiro) => (
              <BarbeiroCard key={barbeiro.id} barbeiro={barbeiro} onVerPerfil={() => setBarbeiroSelecionado(barbeiro)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
