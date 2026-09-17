import { useState } from "react";
import { CalendarClock, CheckCircle2, MessageCircle, XCircle } from "lucide-react";
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
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-base font-medium text-base-50">
            {horaCurta(agendamento.inicio)} — {agendamento.nomeCliente}
          </p>
          <p className="text-sm text-base-300">{servico?.nome ?? "Serviço"}</p>
        </div>
        <Badge status={agendamento.status}>{RESUMO_STATUS[agendamento.status]}</Badge>
      </div>

      {podeAgir && (
        <div className="flex flex-wrap gap-1 border-t border-base-500/40 pt-2 text-sm">
          <button
            onClick={aoAbrirWhatsapp}
            disabled={abrindo}
            className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-destaque-600 transition-colors hover:bg-destaque-500/10 disabled:opacity-50"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp
          </button>
          <button
            onClick={() => onReagendar(agendamento)}
            className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-base-300 transition-colors hover:bg-base-500/30 hover:text-base-50"
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Reagendar
          </button>
          <button
            onClick={aoConcluir}
            disabled={concluir.isPending}
            className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-destaque-600 transition-colors hover:bg-destaque-500/10 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Concluir
          </button>
          <button
            onClick={() => onCancelar(agendamento)}
            className="flex items-center gap-1.5 rounded px-2 py-1 font-medium text-red-600 transition-colors hover:bg-red-500/10"
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar
          </button>
        </div>
      )}
    </Card>
  );
}
