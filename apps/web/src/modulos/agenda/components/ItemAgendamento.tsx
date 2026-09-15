import { useState } from "react";
import { Card } from "../../../componentes/Card";
import { Badge } from "../../../componentes/Badge";
import { useLinkWhatsapp, useEditarAgendamento } from "../hooks/useMutacoesAgendamento";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useToast } from "../../../componentes/Toast";
import type { AgendamentoDoDia, ServicoInterno } from "../tipos";

function horaCurta(horarioLocal: string): string {
  return horarioLocal.slice(11, 16);
}

const RESUMO_STATUS: Record<AgendamentoDoDia["status"], string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
};

type Props = {
  agendamento: AgendamentoDoDia;
  servicos: ServicoInterno[];
  onReagendar: (agendamento: AgendamentoDoDia) => void;
  onCancelar: (agendamento: AgendamentoDoDia) => void;
};

export function ItemAgendamento({ agendamento, servicos, onReagendar, onCancelar }: Props) {
  const servico = servicos.find((s) => s.id === agendamento.servicoId);
  const linkWhatsapp = useLinkWhatsapp();
  const concluir = useEditarAgendamento();
  const { mostrarToast } = useToast();
  const [abrindo, setAbrindo] = useState(false);

  function aoAbrirWhatsapp() {
    setAbrindo(true);
    linkWhatsapp.mutate(agendamento.id, {
      onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
      onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
      onSettled: () => setAbrindo(false),
    });
  }

  function aoConcluir() {
    // Não existe "registrar pagamento" separado no back-end: marcar como `concluido`
    // é o que dispara o lançamento financeiro automático (valor copiado do serviço,
    // ver `financeiro.service.ts`) — não há campo de forma de pagamento na API.
    concluir.mutate(
      { id: agendamento.id, status: "concluido" },
      {
        onSuccess: () => mostrarToast("Agendamento concluído — lançamento financeiro criado."),
        onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
      }
    );
  }

  const podeAgir = agendamento.status === "confirmado";

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">
            {horaCurta(agendamento.inicio)} — {agendamento.nomeCliente}
          </p>
          <p className="text-sm text-base-300">{servico?.nome ?? "Serviço"}</p>
        </div>
        <Badge status={agendamento.status}>{RESUMO_STATUS[agendamento.status]}</Badge>
      </div>

      {podeAgir && (
        <div className="flex flex-wrap gap-2 pt-1 text-sm">
          <button onClick={aoAbrirWhatsapp} disabled={abrindo} className="text-destaque-400 underline">
            WhatsApp
          </button>
          <button onClick={() => onReagendar(agendamento)} className="text-base-300 underline">
            Reagendar
          </button>
          <button onClick={aoConcluir} disabled={concluir.isPending} className="text-destaque-400 underline">
            Concluir
          </button>
          <button onClick={() => onCancelar(agendamento)} className="text-red-400 underline">
            Cancelar
          </button>
        </div>
      )}
    </Card>
  );
}
