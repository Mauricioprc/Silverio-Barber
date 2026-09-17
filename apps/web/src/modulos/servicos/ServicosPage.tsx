import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Card } from "../../componentes/Card";
import { Badge } from "../../componentes/Badge";
import { Botao } from "../../componentes/Botao";
import { Skeleton } from "../../componentes/Skeleton";
import { EstadoVazio } from "../../componentes/EstadoVazio";
import { useToast } from "../../componentes/Toast";
import { mensagemHumana } from "../../lib/mensagens-erro";
import { useServicos } from "./hooks/useServicos";
import { useDesativarServico, useEditarServico } from "./hooks/useMutacoesServico";
import { FormularioServico } from "./components/FormularioServico";
import type { ServicoInterno } from "./tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ServicosPage() {
  const { data: servicos, isLoading, isError } = useServicos();
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<ServicoInterno | null>(null);
  const [mutandoId, setMutandoId] = useState<number | null>(null);

  const desativar = useDesativarServico();
  const reativar = useEditarServico();
  const { mostrarToast } = useToast();

  function aoEditar(servico: ServicoInterno) {
    setServicoEditando(servico);
    setFormularioAberto(true);
  }

  function aoNovoServico() {
    setServicoEditando(null);
    setFormularioAberto(true);
  }

  function aoAlternarAtivo(servico: ServicoInterno) {
    setMutandoId(servico.id);
    if (servico.ativo) {
      desativar.mutate(servico.id, {
        onSuccess: () => mostrarToast("Serviço desativado."),
        onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
        onSettled: () => setMutandoId(null),
      });
    } else {
      reativar.mutate(
        { id: servico.id, ativo: true },
        {
          onSuccess: () => mostrarToast("Serviço reativado."),
          onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
          onSettled: () => setMutandoId(null),
        }
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-24 md:pb-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-base-50">Serviços</h1>
        <Botao onClick={aoNovoServico}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo serviço
        </Botao>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {isError && <EstadoVazio titulo="Não foi possível carregar os serviços." descricao="Tente novamente em instantes." />}

      {!isLoading && !isError && servicos && servicos.length === 0 && (
        <EstadoVazio titulo="Nenhum serviço cadastrado." descricao="Crie o primeiro serviço para começar." />
      )}

      {!isLoading && !isError && servicos && servicos.length > 0 && (
        <div className="flex flex-col gap-3">
          {servicos.map((servico) => (
            <Card key={servico.id} className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-serif text-base font-medium text-base-50">{servico.nome}</p>
                  {!servico.ativo && <Badge status="cancelado">Inativo</Badge>}
                </div>
                {servico.descricao && <p className="text-sm text-base-300">{servico.descricao}</p>}
                <p className="text-sm text-base-300">
                  {formatarReais(servico.valorCentavos)} · {servico.duracaoMinutos} min
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                <button
                  onClick={() => aoEditar(servico)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-base-300 transition-colors hover:bg-base-500/30 hover:text-base-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar
                </button>
                <button
                  onClick={() => aoAlternarAtivo(servico)}
                  disabled={mutandoId === servico.id}
                  className={`rounded px-2 py-1 font-medium transition-colors disabled:opacity-50 ${
                    servico.ativo ? "text-red-600 hover:bg-red-500/10" : "text-destaque-600 hover:bg-destaque-500/10"
                  }`}
                >
                  {servico.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FormularioServico aberto={formularioAberto} onFechar={() => setFormularioAberto(false)} servico={servicoEditando} />
    </div>
  );
}
