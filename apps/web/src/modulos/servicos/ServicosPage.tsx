import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "../../componentes/Card";
import { Badge } from "../../componentes/Badge";
import { Botao } from "../../componentes/Botao";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import { ErroEstado } from "../../componentes/ErroEstado";
import { AvatarClaro } from "../../componentes/AvatarClaro";
import { useServicos } from "./hooks/useServicos";
import { useBarbeirosDoServico } from "./hooks/useBarbeirosDoServico";
import { SheetServico } from "./components/SheetServico";
import type { ServicoInterno } from "./tipos";

const MAX_AVATARES = 3;

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Pilha de iniciais de quem faz o serviço (Fase D2) — até 3 avatares + "+N" pro resto. */
function AvataresDoServico({ servicoId }: { servicoId: number }) {
  const { data: barbeiros, isLoading } = useBarbeirosDoServico(servicoId);

  if (isLoading || !barbeiros) return <Skeleton className="h-7 w-16 rounded-full" />;
  if (barbeiros.length === 0) return null;

  const visiveis = barbeiros.slice(0, MAX_AVATARES);
  const restantes = barbeiros.length - visiveis.length;

  return (
    <div className="flex shrink-0 -space-x-2" title={barbeiros.map((b) => b.nome).join(", ")}>
      {visiveis.map((barbeiro) => (
        <div key={barbeiro.id} className="rounded-full ring-2 ring-surface">
          <AvatarClaro nome={barbeiro.nome} tamanho="xs" />
        </div>
      ))}
      {restantes > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-text-muted ring-2 ring-surface">
          +{restantes}
        </div>
      )}
    </div>
  );
}

function LinhaServico({ servico, onAbrir }: { servico: ServicoInterno; onAbrir: () => void }) {
  return (
    <button
      onClick={onAbrir}
      className="flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base font-semibold text-text">{servico.nome}</p>
          {!servico.ativo && <Badge status="cancelado-novo">Inativo</Badge>}
        </div>
        <p className="text-sm text-text-muted">
          {formatarReais(servico.valorCentavos)} · {servico.duracaoMinutos} min
        </p>
      </div>
      <AvataresDoServico servicoId={servico.id} />
      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}

export default function ServicosPage() {
  const navigate = useNavigate();
  const { data: servicos, isLoading, isError, refetch } = useServicos();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<ServicoInterno | null>(null);
  const [mostrarDesativados, setMostrarDesativados] = useState(false);

  function aoEditar(servico: ServicoInterno) {
    setServicoEditando(servico);
    setSheetAberto(true);
  }

  function aoNovoServico() {
    setServicoEditando(null);
    setSheetAberto(true);
  }

  const ativos = servicos?.filter((s) => s.ativo) ?? [];
  const inativos = servicos?.filter((s) => !s.ativo) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <button
        onClick={() => navigate("/painel/mais")}
        className="flex h-11 w-fit items-center gap-1 rounded-lg pr-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Mais
      </button>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold text-text">Serviços</h1>
        <Botao variante="dourada" tamanho="md" onClick={aoNovoServico}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo serviço
        </Botao>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      )}

      {isError && <ErroEstado mensagem="Não foi possível carregar os serviços." onTentarNovamente={() => refetch()} />}

      {!isLoading && !isError && servicos && servicos.length === 0 && (
        <EstadoVazio titulo="Nenhum serviço cadastrado" acao={{ rotulo: "Novo serviço", onClick: aoNovoServico }} />
      )}

      {!isLoading && !isError && ativos.length > 0 && (
        <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
          {ativos.map((servico) => (
            <LinhaServico key={servico.id} servico={servico} onAbrir={() => aoEditar(servico)} />
          ))}
        </Card>
      )}

      {!isLoading && !isError && servicos && servicos.length > 0 && ativos.length === 0 && (
        <EstadoVazio titulo="Nenhum serviço ativo" acao={{ rotulo: "Novo serviço", onClick: aoNovoServico }} />
      )}

      {!isLoading && !isError && inativos.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarDesativados((atual) => !atual)}
            className="flex h-11 items-center text-sm font-medium text-text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {mostrarDesativados ? "Ocultar" : "Mostrar"} desativados ({inativos.length})
          </button>
          {mostrarDesativados && (
            <Card className="flex flex-col divide-y divide-border border-border bg-surface p-0">
              {inativos.map((servico) => (
                <LinhaServico key={servico.id} servico={servico} onAbrir={() => aoEditar(servico)} />
              ))}
            </Card>
          )}
        </div>
      )}

      <SheetServico aberto={sheetAberto} onFechar={() => setSheetAberto(false)} servico={servicoEditando} />
    </div>
  );
}
