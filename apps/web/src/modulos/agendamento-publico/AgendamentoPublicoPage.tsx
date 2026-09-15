import { useState } from "react";
import { useAuthCliente } from "../../contextos/auth-cliente-context";
import { IndicadorEtapa } from "./components/IndicadorEtapa";
import { EtapaServico } from "./components/EtapaServico";
import { EtapaBarbeiro } from "./components/EtapaBarbeiro";
import { EtapaHorario } from "./components/EtapaHorario";
import { EtapaDados } from "./components/EtapaDados";
import { EtapaVerificacao } from "./components/EtapaVerificacao";
import { EtapaRevisao } from "./components/EtapaRevisao";
import { EtapaConfirmacao } from "./components/EtapaConfirmacao";
import type { Agendamento, Etapa, SelecaoAgendamento } from "./tipos";

const SELECAO_INICIAL: SelecaoAgendamento = {
  servico: null,
  barbeiro: null,
  data: null,
  horario: null,
  aceitaMensagensAutomaticas: false,
};

/**
 * Orquestrador do fluxo linear (ver escopo da Fase 2): guarda a seleção acumulada e a
 * etapa atual num único componente, sem router aninhado — o "voltar" é sempre trocar a
 * etapa em memória, preservando o que já foi escolhido (nunca resetando `selecao`).
 */
export default function AgendamentoPublicoPage() {
  const { cliente } = useAuthCliente();
  const [selecao, setSelecao] = useState<SelecaoAgendamento>(SELECAO_INICIAL);
  const [etapa, setEtapa] = useState<Etapa>("servico");
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<Agendamento | null>(null);

  function aposEscolherHorario(data: string, horario: SelecaoAgendamento["horario"]) {
    setSelecao((atual) => ({ ...atual, data, horario }));
    // Cliente já logado e com telefone verificado (voltou pra marcar de novo) pula
    // direto pra revisão — não repete identificação/verificação à toa.
    setEtapa(cliente?.telefoneVerificado ? "revisao" : "dados");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col p-4">
      <IndicadorEtapa etapa={etapa} />

      {etapa === "servico" && (
        <EtapaServico
          onEscolher={(servico) => {
            setSelecao((atual) => ({ ...atual, servico }));
            setEtapa("barbeiro");
          }}
        />
      )}

      {etapa === "barbeiro" && (
        <EtapaBarbeiro
          onEscolher={(barbeiro) => {
            setSelecao((atual) => ({ ...atual, barbeiro }));
            setEtapa("horario");
          }}
        />
      )}

      {etapa === "horario" && selecao.barbeiro && selecao.servico && (
        <EtapaHorario
          barbeiroId={selecao.barbeiro.id}
          dataInicial={selecao.data}
          duracaoMinutos={selecao.servico.duracaoMinutos}
          onEscolher={aposEscolherHorario}
        />
      )}

      {etapa === "dados" && <EtapaDados onIdentificado={(jaVerificado) => setEtapa(jaVerificado ? "revisao" : "verificacao")} />}

      {etapa === "verificacao" && <EtapaVerificacao onVerificado={() => setEtapa("revisao")} />}

      {etapa === "revisao" && (
        <EtapaRevisao
          selecao={selecao}
          onAlterarOptIn={(valor) => setSelecao((atual) => ({ ...atual, aceitaMensagensAutomaticas: valor }))}
          onConfirmado={(agendamento) => {
            setAgendamentoConfirmado(agendamento);
            setEtapa("confirmacao");
          }}
          onPrecisaVerificar={() => setEtapa("verificacao")}
          onConflitoHorario={() => setEtapa("horario")}
        />
      )}

      {etapa === "confirmacao" && agendamentoConfirmado && (
        <EtapaConfirmacao agendamento={agendamentoConfirmado} selecao={selecao} />
      )}

      {etapa !== "servico" && etapa !== "confirmacao" && (
        <button
          onClick={() => voltar(etapa, setEtapa)}
          className="mt-4 text-sm text-base-300 underline"
        >
          Voltar
        </button>
      )}
    </div>
  );
}

const ETAPA_ANTERIOR: Partial<Record<Etapa, Etapa>> = {
  barbeiro: "servico",
  horario: "barbeiro",
  dados: "horario",
  verificacao: "dados",
  revisao: "horario",
};

function voltar(etapa: Etapa, setEtapa: (etapa: Etapa) => void) {
  const anterior = ETAPA_ANTERIOR[etapa];
  if (anterior) setEtapa(anterior);
}
