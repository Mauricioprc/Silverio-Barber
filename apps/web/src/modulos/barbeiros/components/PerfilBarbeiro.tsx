import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AvatarClaro } from "../../../componentes/AvatarClaro";
import { Card } from "../../../componentes/Card";
import { LinhaComparacao } from "../../../componentes/LinhaComparacao";
import { Skeleton } from "../../../componentes/Skeleton";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useMetricasComComparacao } from "../hooks/useMetricasComComparacao";
import { useEditarNomeBarbeiro } from "../hooks/useMutacoesBarbeiro";
import { useDisponibilidadeBarbeiro } from "../hooks/useDisponibilidadeBarbeiro";
import { CartaoHorario } from "./CartaoHorario";
import { SheetHorario } from "./SheetHorario";
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
      <div className="flex items-center gap-1">
        <span className="text-2xl font-bold text-text">{barbeiro.nome}</span>
        <button
          onClick={() => {
            setValor(barbeiro.nome);
            setEditando(true);
          }}
          aria-label="Editar nome"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
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
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") setEditando(false);
        }}
        className="campo-autofill-claro h-11 rounded-lg border border-border bg-surface px-2 text-2xl font-bold text-text outline-none focus:border-gold focus:ring-1 focus:ring-gold"
      />
      <button
        onClick={salvar}
        disabled={editar.isPending}
        aria-label="Salvar nome"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-success transition-colors hover:bg-success/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <Check className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        onClick={() => setEditando(false)}
        aria-label="Cancelar edição"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

type Props = { barbeiro: BarbeiroInterno; modo: "proprio" | "admin" };

export function PerfilBarbeiro({ barbeiro, modo }: Props) {
  const { data: metricas, isLoading: carregandoMetricas } = useMetricasComComparacao(barbeiro.id);
  const { data: disponibilidade, isLoading: carregandoDisponibilidade } = useDisponibilidadeBarbeiro(barbeiro.id);
  const [sheetHorarioAberto, setSheetHorarioAberto] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <AvatarClaro nome={barbeiro.nome} tamanho="xl" />
        <NomeEditavel barbeiro={barbeiro} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-muted">Desempenho no mês</p>
        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col gap-1 border-border bg-surface p-4">
            {carregandoMetricas ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-xl font-bold text-text">{metricas?.atendimentos ?? 0}</p>
            )}
            <p className="text-xs text-text-muted">Atendimentos concluídos</p>
            {metricas?.variacaoAtendimentos && (
              <LinhaComparacao variacao={metricas.variacaoAtendimentos} rotulo={metricas.rotuloComparacao} tamanho="xs" />
            )}
          </Card>
          <Card className="flex flex-col gap-1 border-border bg-surface p-4">
            {carregandoMetricas ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-xl font-bold text-text">{formatarReais(metricas?.faturamentoCentavos ?? 0)}</p>
            )}
            <p className="text-xs text-text-muted">Faturado</p>
            {metricas?.variacaoFaturamento && (
              <LinhaComparacao variacao={metricas.variacaoFaturamento} rotulo={metricas.rotuloComparacao} tamanho="xs" />
            )}
          </Card>
        </div>
      </div>

      <CartaoHorario
        disponibilidade={disponibilidade}
        isLoading={carregandoDisponibilidade}
        onAbrir={() => setSheetHorarioAberto(true)}
      />

      {disponibilidade && (
        <SheetHorario
          barbeiroId={barbeiro.id}
          disponibilidade={disponibilidade}
          aberto={sheetHorarioAberto}
          onFechar={() => setSheetHorarioAberto(false)}
        />
      )}

      {modo === "proprio" && <FormularioAcesso usuarioAtual={barbeiro.usuario} telefoneAtual={barbeiro.telefone} />}
    </div>
  );
}
