import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Switch } from "../../../componentes/Switch";
import { Badge } from "../../../componentes/Badge";
import { Skeleton } from "../../../componentes/Skeleton";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useAlternarVinculoServico } from "../../servicos/hooks/useMutacoesServico";
import { useServicosDoBarbeiro } from "../hooks/useServicosDoBarbeiro";

type Props = { barbeiroId: number; aberto: boolean; onFechar: () => void };

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * "Meus serviços" (Fase D2) — todo o catálogo, cada um com um `Switch` ligado/desligado
 * conforme este barbeiro faz ou não (preço/duração são sempre os padrão do catálogo,
 * sem personalização — decisão confirmada na proposta da Fase D). Cada toggle já salva
 * na hora (sem botão "Salvar" no rodapé), igual ao padrão de outros switches do app.
 */
export function SheetMeusServicos({ barbeiroId, aberto, onFechar }: Props) {
  const { data: servicos, isLoading } = useServicosDoBarbeiro(barbeiroId);
  const alternar = useAlternarVinculoServico();
  const { mostrarToast } = useToast();

  function aoAlternar(servicoId: number, ativo: boolean) {
    alternar.mutate(
      { barbeiroId, servicoId, ativo },
      { onError: (erro) => mostrarToast(mensagemHumana(erro), "erro") }
    );
  }

  return (
    <FolhaInferior titulo="Meus serviços" aberto={aberto} onFechar={onFechar}>
      <div className="flex flex-col divide-y divide-border pb-4">
        {isLoading && (
          <div className="flex flex-col gap-3 py-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && servicos?.length === 0 && <p className="py-4 text-sm text-text-muted">Nenhum serviço cadastrado no catálogo.</p>}

        {servicos?.map((servico) => (
          <div key={servico.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-text">{servico.nome}</p>
                {!servico.ativoNoCatalogo && <Badge status="cancelado-novo">Inativo</Badge>}
              </div>
              <p className="text-sm text-text-muted">
                {formatarReais(servico.valorCentavos)} · {servico.duracaoMinutos} min
              </p>
            </div>
            <Switch
              ligado={servico.vinculado}
              onMudar={(ligado) => aoAlternar(servico.id, ligado)}
              rotulo={`Fazer ${servico.nome}`}
            />
          </div>
        ))}
      </div>
    </FolhaInferior>
  );
}
