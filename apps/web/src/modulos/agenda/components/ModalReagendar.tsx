import { useState } from "react";
import { Modal } from "../../../componentes/Modal";
import { Select } from "../../../componentes/Select";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useEditarAgendamento, conflitoDeHorario } from "../hooks/useMutacoesAgendamento";
import { useHorariosDisponiveis } from "../../agendamento-publico/hooks/useHorariosDisponiveis";
import type { AgendamentoDoDia, BarbeiroInterno, ServicoInterno } from "../tipos";

function horaCurta(horarioLocal: string): string {
  return horarioLocal.slice(11, 16);
}

type Props = {
  agendamento: AgendamentoDoDia | null;
  barbeiros: BarbeiroInterno[];
  servicos: ServicoInterno[];
  onFechar: () => void;
};

export function ModalReagendar({ agendamento, barbeiros, servicos, onFechar }: Props) {
  const servico = agendamento ? servicos.find((s) => s.id === agendamento.servicoId) : undefined;

  const [barbeiroId, setBarbeiroId] = useState<number | null>(agendamento?.barbeiroId ?? null);
  const [data, setData] = useState(agendamento ? agendamento.inicio.slice(0, 10) : "");
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const { data: horarios, isLoading } = useHorariosDisponiveis(barbeiroId, data, servico?.duracaoMinutos ?? 0);
  const editar = useEditarAgendamento();
  const { mostrarToast } = useToast();

  if (!agendamento) return null;

  function aoConfirmar() {
    if (!agendamento || !barbeiroId || !horarioEscolhido) return;
    setErro(null);
    editar.mutate(
      { id: agendamento.id, barbeiroId, inicio: horarioEscolhido },
      {
        onSuccess: () => {
          mostrarToast("Agendamento reagendado.");
          onFechar();
        },
        onError: (erroCapturado) => {
          if (conflitoDeHorario(erroCapturado)) {
            setErro("Esse horário acabou de ser reservado. Escolha outro.");
            setHorarioEscolhido(null);
            return;
          }
          setErro(mensagemHumana(erroCapturado));
        },
      }
    );
  }

  return (
    <Modal titulo="Reagendar" aberto={agendamento !== null} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-base-300">{agendamento.nomeCliente} — {servico?.nome}</p>

        <Select rotulo="Barbeiro" value={barbeiroId ?? ""} onChange={(e) => setBarbeiroId(Number(e.target.value) || null)}>
          {barbeiros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </Select>

        <Input rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />

        <div>
          <p className="mb-1 text-sm text-base-300">Horário</p>
          {isLoading && <p className="text-sm text-base-300">Carregando...</p>}
          {!isLoading && horarios && horarios.length === 0 && <p className="text-sm text-base-300">Nenhum horário livre.</p>}
          {!isLoading && horarios && horarios.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {horarios.map((h) => (
                <button
                  key={h.inicio}
                  onClick={() => setHorarioEscolhido(h.inicio)}
                  className={`rounded border py-1.5 text-sm ${
                    horarioEscolhido === h.inicio ? "border-destaque-500 bg-destaque-500/10" : "border-base-700"
                  }`}
                >
                  {horaCurta(h.inicio)}
                </button>
              ))}
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <Botao onClick={aoConfirmar} carregando={editar.isPending} disabled={!horarioEscolhido}>
          Confirmar novo horário
        </Botao>
      </div>
    </Modal>
  );
}
