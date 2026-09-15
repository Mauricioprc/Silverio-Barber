import { useState } from "react";
import { useCriarAgendamentoPublico, precisaVerificar, conflitoDeHorario } from "../hooks/useCriarAgendamentoPublico";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { Card } from "../../../componentes/Card";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import type { Agendamento, SelecaoAgendamento } from "../tipos";

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
}

type Props = {
  selecao: SelecaoAgendamento;
  onAlterarOptIn: (valor: boolean) => void;
  onConfirmado: (agendamento: Agendamento) => void;
  onPrecisaVerificar: () => void;
  onConflitoHorario: () => void;
};

export function EtapaRevisao({ selecao, onAlterarOptIn, onConfirmado, onPrecisaVerificar, onConflitoHorario }: Props) {
  const { servico, barbeiro, horario, aceitaMensagensAutomaticas } = selecao;
  const criar = useCriarAgendamentoPublico();
  const { mostrarToast } = useToast();
  const [erro, setErro] = useState<string | null>(null);

  if (!servico || !barbeiro || !horario) {
    return null; // inatingível — orquestrador só chega aqui com tudo escolhido
  }

  function aoConfirmar() {
    setErro(null);
    criar.mutate(
      {
        barbeiroId: barbeiro!.id,
        servicoId: servico!.id,
        inicio: horario!.inicio,
        aceitaMensagensAutomaticas,
      },
      {
        onSuccess: (agendamento) => onConfirmado(agendamento),
        onError: (erroCapturado) => {
          if (precisaVerificar(erroCapturado)) {
            onPrecisaVerificar();
            return;
          }
          if (conflitoDeHorario(erroCapturado)) {
            // Usa toast, não `erro` local: `onConflitoHorario` troca a etapa e desmonta
            // este componente no mesmo tick, então uma mensagem em state local nunca
            // chegaria a renderizar.
            mostrarToast("Esse horário acabou de ser reservado. Veja os horários disponíveis atualizados abaixo.", "erro");
            onConflitoHorario();
            return;
          }
          setErro(mensagemHumana(erroCapturado));
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-base-300">Serviço</span>
          <span className="font-medium">{servico.nome}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-base-300">Barbeiro</span>
          <span className="font-medium">{barbeiro.nome}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-base-300">Quando</span>
          <span className="font-medium">{formatarDataHora(horario.inicio)}</span>
        </div>
        <div className="flex justify-between border-t border-base-700 pt-2">
          <span className="text-base-300">Valor</span>
          <span className="font-semibold text-destaque-400">{formatarReais(servico.valorCentavos)}</span>
        </div>
      </Card>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={aceitaMensagensAutomaticas}
          onChange={(e) => onAlterarOptIn(e.target.checked)}
          className="mt-1"
        />
        <span>Quero receber confirmação e lembrete deste agendamento por WhatsApp.</span>
      </label>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <Botao onClick={aoConfirmar} carregando={criar.isPending}>
        Confirmar agendamento
      </Botao>
    </div>
  );
}
