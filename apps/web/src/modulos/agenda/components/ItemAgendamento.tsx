import { useState } from "react";
import { CalendarClock, CheckCircle2, MessageCircle, MoreHorizontal, XCircle } from "lucide-react";
import { Card } from "../../../componentes/Card";
import { Badge } from "../../../componentes/Badge";
import { Botao } from "../../../componentes/Botao";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
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

// Sufixo "-novo" no Badge pertence ao redesenho claro (ver
// front-redesign-fase0-agenda.md) — chaves antigas seguem intactas pras telas
// que ainda não migraram.
const BADGE_STATUS: Record<AgendamentoDoDia["status"], string> = {
  confirmado: "confirmado-novo",
  cancelado: "cancelado-novo",
  concluido: "concluido-novo",
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
  const [menuAberto, setMenuAberto] = useState(false);

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
    <Card
      className={`flex flex-col gap-3 border-border bg-surface p-4 ${
        podeAgir ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-text">
            {horaCurta(agendamento.inicio)} — {agendamento.nomeCliente}
          </p>
          <p className="text-sm text-text-muted">{servico?.nome ?? "Serviço"}</p>
        </div>
        <Badge status={BADGE_STATUS[agendamento.status]}>{RESUMO_STATUS[agendamento.status]}</Badge>
      </div>

      {podeAgir && (
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Botao variante="dourada" tamanho="md" onClick={aoConcluir} carregando={concluir.isPending}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Concluir
          </Botao>
          <button
            onClick={aoAbrirWhatsapp}
            disabled={abrindo}
            aria-label="Abrir conversa no WhatsApp"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Mais ações"
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <FolhaInferior titulo="Mais ações" aberto={menuAberto} onFechar={() => setMenuAberto(false)}>
        <div className="flex flex-col gap-2 pb-4">
          <button
            onClick={() => {
              setMenuAberto(false);
              onReagendar(agendamento);
            }}
            className="flex h-14 items-center gap-3 rounded-xl px-3 text-left text-text transition-colors hover:bg-surface-2"
          >
            <CalendarClock className="h-5 w-5 text-text-muted" aria-hidden="true" />
            Reagendar
          </button>
          <button
            onClick={() => {
              setMenuAberto(false);
              onCancelar(agendamento);
            }}
            className="flex h-14 items-center gap-3 rounded-xl px-3 text-left text-danger transition-colors hover:bg-danger/10"
          >
            <XCircle className="h-5 w-5" aria-hidden="true" />
            Cancelar agendamento
          </button>
        </div>
      </FolhaInferior>
    </Card>
  );
}
