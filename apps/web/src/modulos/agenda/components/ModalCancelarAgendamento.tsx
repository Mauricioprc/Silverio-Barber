import { Modal } from "../../../componentes/Modal";
import { Botao } from "../../../componentes/Botao";
import { useEditarAgendamento } from "../hooks/useMutacoesAgendamento";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useToast } from "../../../componentes/Toast";
import type { AgendamentoDoDia, ServicoInterno, BarbeiroInterno } from "../tipos";

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
}

type Props = {
  agendamento: AgendamentoDoDia | null;
  servicos: ServicoInterno[];
  barbeiros: BarbeiroInterno[];
  onFechar: () => void;
};

export function ModalCancelarAgendamento({ agendamento, servicos, barbeiros, onFechar }: Props) {
  const editar = useEditarAgendamento();
  const { mostrarToast } = useToast();

  const servico = agendamento ? servicos.find((s) => s.id === agendamento.servicoId) : undefined;
  const barbeiro = agendamento ? barbeiros.find((b) => b.id === agendamento.barbeiroId) : undefined;

  function aoConfirmar() {
    if (!agendamento) return;
    editar.mutate(
      { id: agendamento.id, status: "cancelado" },
      {
        onSuccess: () => {
          mostrarToast("Agendamento cancelado.");
          onFechar();
        },
        onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
      }
    );
  }

  return (
    <Modal titulo="Cancelar agendamento" aberto={agendamento !== null} onFechar={onFechar}>
      {agendamento && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-text">
            <p>
              <span className="text-text-muted">Cliente:</span> {agendamento.nomeCliente}
            </p>
            <p>
              <span className="text-text-muted">Serviço:</span> {servico?.nome ?? "—"}
            </p>
            <p>
              <span className="text-text-muted">Barbeiro:</span> {barbeiro?.nome ?? "—"}
            </p>
            <p>
              <span className="text-text-muted">Quando:</span> {formatarDataHora(agendamento.inicio)}
            </p>
          </div>
          <p className="text-sm text-danger">Essa ação não pode ser desfeita pelo painel.</p>
          <div className="flex justify-end gap-2">
            <Botao variante="contorno-novo" tamanho="md" onClick={onFechar}>
              Voltar
            </Botao>
            <Botao variante="perigo" tamanho="md" onClick={aoConfirmar} carregando={editar.isPending}>
              Confirmar cancelamento
            </Botao>
          </div>
        </div>
      )}
    </Modal>
  );
}
