import { useState } from "react";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
import { Avatar } from "../../../componentes/Avatar";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useMetricasBarbeiro } from "../hooks/useMetricasBarbeiro";
import { useAlternarAtivoBarbeiro, useEditarNomeBarbeiro } from "../hooks/useMutacoesBarbeiro";
import { EditorDisponibilidade } from "./EditorDisponibilidade";
import { FormularioAcesso } from "./FormularioAcesso";
import type { BarbeiroInterno } from "../tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function NomeEditavel({ barbeiro }: { barbeiro: BarbeiroInterno }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(barbeiro.nome);
  const editar = useEditarNomeBarbeiro();
  const { mostrarToast } = useToast();

  if (!editando) {
    return (
      <button
        onClick={() => {
          setValor(barbeiro.nome);
          setEditando(true);
        }}
        className="group flex items-center gap-2"
        aria-label="Editar nome"
      >
        <span className="font-serif text-xl font-semibold text-white">{barbeiro.nome}</span>
        <Pencil className="h-3.5 w-3.5 text-white/30 transition-colors group-hover:text-destaque-400" aria-hidden="true" />
      </button>
    );
  }

  function salvar() {
    const nome = valor.trim();
    if (!nome || nome === barbeiro.nome) {
      setEditando(false);
      return;
    }
    editar.mutate(
      { id: barbeiro.id, nome },
      {
        onSuccess: () => {
          mostrarToast("Nome atualizado.");
          setEditando(false);
        },
        onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
      }
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") setEditando(false);
        }}
        className="rounded border border-base-600 bg-base-800 px-2 py-1 font-serif text-xl font-semibold text-white outline-none focus:border-destaque-500 focus:ring-1 focus:ring-destaque-500"
      />
      <button onClick={salvar} disabled={editar.isPending} aria-label="Salvar nome" className="text-emerald-400 hover:text-emerald-300">
        <Check className="h-5 w-5" aria-hidden="true" />
      </button>
      <button onClick={() => setEditando(false)} aria-label="Cancelar edição" className="text-white/40 hover:text-white">
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

type Props = { barbeiro: BarbeiroInterno; modo: "proprio" | "admin"; onVoltar?: () => void };

export function PerfilBarbeiro({ barbeiro, modo, onVoltar }: Props) {
  const { data: metricas, isLoading: carregandoMetricas } = useMetricasBarbeiro(barbeiro.id, true);
  const alternarAtivo = useAlternarAtivoBarbeiro();
  const { mostrarToast } = useToast();

  function aoAlternarAtivo() {
    alternarAtivo.mutate(
      { id: barbeiro.id, ativo: !barbeiro.ativo },
      {
        onSuccess: () => mostrarToast(barbeiro.ativo ? "Barbeiro desativado." : "Barbeiro ativado."),
        onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {onVoltar && (
        <button
          onClick={onVoltar}
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar nome={barbeiro.nome} tamanho="lg" />
          <div>
            <NomeEditavel barbeiro={barbeiro} />
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${barbeiro.ativo ? "bg-emerald-400" : "bg-white/30"}`}
                aria-hidden="true"
              />
              <span className={barbeiro.ativo ? "text-emerald-400" : "text-white/50"}>
                {barbeiro.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={aoAlternarAtivo}
          disabled={alternarAtivo.isPending}
          className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            barbeiro.ativo
              ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          }`}
        >
          {barbeiro.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">Desempenho no mês</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-base-600 bg-base-800 p-4">
            <p className="font-serif text-xl font-semibold text-white">
              {carregandoMetricas ? "…" : (metricas?.atendimentos ?? 0)}
            </p>
            <p className="text-xs text-white/50">Atendimentos concluídos</p>
          </div>
          <div className="rounded-lg border border-base-600 bg-base-800 p-4">
            <p className="font-serif text-xl font-semibold text-white">
              {carregandoMetricas ? "…" : formatarReais(metricas?.faturamentoCentavos ?? 0)}
            </p>
            <p className="text-xs text-white/50">Faturado</p>
          </div>
        </div>
      </div>

      <EditorDisponibilidade barbeiroId={barbeiro.id} />

      {modo === "proprio" && <FormularioAcesso usuarioAtual={barbeiro.usuario} telefoneAtual={barbeiro.telefone} />}
    </div>
  );
}
