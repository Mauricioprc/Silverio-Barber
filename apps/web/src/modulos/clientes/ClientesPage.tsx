import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Plus, Search } from "lucide-react";
import { useAuthSocio } from "../../contextos/auth-socio-context";
import { useDebounce } from "../../lib/useDebounce";
import { formatPhoneBR } from "../../lib/formatPhoneBR";
import { linkWhatsapp } from "../../lib/linkWhatsapp";
import { useClientesInfinito } from "./hooks/useClientesInfinito";
import { useTotalClientes } from "./hooks/useTotalClientes";
import { FormularioNovoCliente } from "./components/FormularioNovoCliente";
import { AvatarClaro } from "../../componentes/AvatarClaro";
import { Botao } from "../../componentes/Botao";
import { Card } from "../../componentes/Card";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import { ErroEstado } from "../../componentes/ErroEstado";
import type { Cliente } from "./tipos";

function letraDeGrupo(nome: string): string {
  const letra = nome
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(letra) ? letra : "#";
}

function agruparPorLetra(clientes: Cliente[]): { letra: string; itens: Cliente[] }[] {
  const ordenados = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const grupos = new Map<string, Cliente[]>();
  for (const cliente of ordenados) {
    const letra = letraDeGrupo(cliente.nome);
    const grupo = grupos.get(letra) ?? [];
    grupo.push(cliente);
    grupos.set(letra, grupo);
  }
  return [...grupos.entries()].map(([letra, itens]) => ({ letra, itens }));
}

export default function ClientesPage() {
  const navigate = useNavigate();
  const { socio } = useAuthSocio();
  const [busca, setBusca] = useState("");
  const buscaComDebounce = useDebounce(busca, 250);
  const somenteProprios = !socio?.admin;

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useClientesInfinito(buscaComDebounce, somenteProprios);
  const { data: total } = useTotalClientes(somenteProprios);

  const [novoClienteAberto, setNovoClienteAberto] = useState(false);

  const clientes = data?.pages.flatMap((p) => p.clientes) ?? [];
  const buscando = buscaComDebounce.trim().length > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Clientes</h1>
          {total !== undefined && <p className="text-sm text-text-muted">{total} cadastrados</p>}
        </div>
        <Botao variante="dourada" tamanho="md" onClick={() => setNovoClienteAberto(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo cliente
        </Botao>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar por nome ou telefone"
          placeholder="Buscar por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="campo-autofill-claro h-12 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-base text-text outline-none transition-colors placeholder:text-text-muted/70 focus:border-gold focus:ring-1 focus:ring-gold"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && <ErroEstado mensagem="Não foi possível carregar os clientes." onTentarNovamente={() => refetch()} />}

      {!isLoading && !isError && clientes.length === 0 && buscando && (
        <EstadoVazio
          titulo={`Nenhum cliente encontrado para "${buscaComDebounce}"`}
          acao={{ rotulo: `Cadastrar "${buscaComDebounce}"`, onClick: () => setNovoClienteAberto(true) }}
        />
      )}

      {!isLoading && !isError && clientes.length === 0 && !buscando && (
        <EstadoVazio titulo="Nenhum cliente ainda" acao={{ rotulo: "Cadastrar primeiro cliente", onClick: () => setNovoClienteAberto(true) }} />
      )}

      {!isLoading && !isError && clientes.length > 0 && (
        <div className="flex flex-col gap-4">
          {agruparPorLetra(clientes).map((grupo) => (
            <div key={grupo.letra}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{grupo.letra}</p>
              <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
                {grupo.itens.map((cliente) => (
                  <div
                    key={cliente.id}
                    onClick={() => navigate(`/painel/clientes/${cliente.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/painel/clientes/${cliente.id}`);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                  >
                    <AvatarClaro nome={cliente.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-text">{cliente.nome}</p>
                      <p className="text-sm text-text-muted">{formatPhoneBR(cliente.telefone)}</p>
                    </div>
                    <a
                      href={linkWhatsapp(cliente.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Abrir WhatsApp com ${cliente.nome}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </div>
                ))}
              </Card>
            </div>
          ))}

          {hasNextPage && (
            <Botao variante="contorno-novo" tamanho="lg" onClick={() => fetchNextPage()} carregando={isFetchingNextPage}>
              Carregar mais
            </Botao>
          )}
        </div>
      )}

      <FormularioNovoCliente
        aberto={novoClienteAberto}
        telefoneInicial={buscando ? buscaComDebounce : ""}
        onFechar={() => setNovoClienteAberto(false)}
        onCriado={(cliente) => {
          setNovoClienteAberto(false);
          navigate(`/painel/clientes/${cliente.id}`);
        }}
      />
    </div>
  );
}
