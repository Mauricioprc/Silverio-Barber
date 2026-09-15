import { Card } from "../../../componentes/Card";
import type { Agendamento, SelecaoAgendamento } from "../tipos";

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(/[ T]/);
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
}

export function EtapaConfirmacao({ agendamento, selecao }: { agendamento: Agendamento; selecao: SelecaoAgendamento }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-semibold text-destaque-400">Agendamento confirmado!</h1>
      <Card className="w-full text-left">
        <p>
          <span className="text-base-300">Serviço:</span> {selecao.servico?.nome}
        </p>
        <p>
          <span className="text-base-300">Barbeiro:</span> {selecao.barbeiro?.nome}
        </p>
        <p>
          <span className="text-base-300">Quando:</span> {formatarDataHora(agendamento.inicio)}
        </p>
      </Card>
      <p className="text-sm text-base-300">
        {selecao.aceitaMensagensAutomaticas
          ? "Você vai receber uma confirmação e um lembrete por WhatsApp."
          : "Guarde a data e o horário — você optou por não receber mensagens automáticas."}
      </p>
    </div>
  );
}
