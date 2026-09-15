import { useState } from "react";
import { Modal } from "../../../componentes/Modal";
import { Select } from "../../../componentes/Select";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useCriarAgendamentoBalcao, conflitoDeHorario } from "../hooks/useMutacoesAgendamento";
import { useHorariosDisponiveis } from "../../agendamento-publico/hooks/useHorariosDisponiveis";
import type { BarbeiroInterno, ServicoInterno } from "../tipos";

function horaCurta(horarioLocal: string): string {
  return horarioLocal.slice(11, 16);
}

type Props = {
  aberto: boolean;
  onFechar: () => void;
  barbeiros: BarbeiroInterno[];
  servicos: ServicoInterno[];
  barbeiroInicial: number | null;
  dataInicial: string;
};

/**
 * Reaproveita a mesma consulta de disponibilidade da Fase 2 (`/publico/disponibilidade`,
 * pública, sem exigir sessão de cliente) em vez de duplicar a lógica de fatiar horários —
 * ver escopo da Fase 3. A diferença é só o schema do corpo enviado no fim
 * (`criarAgendamentoSchema` de balcão: `nomeCliente`/`telefoneCliente`, sem
 * `aceitaMensagensAutomaticas`, ver `useMutacoesAgendamento.ts`).
 */
export function FormularioAgendamentoBalcao({ aberto, onFechar, barbeiros, servicos, barbeiroInicial, dataInicial }: Props) {
  const [barbeiroId, setBarbeiroId] = useState<number | null>(barbeiroInicial);
  const [servicoId, setServicoId] = useState<number | null>(null);
  const [data, setData] = useState(dataInicial);
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const servico = servicos.find((s) => s.id === servicoId) ?? null;
  const { data: horarios, isLoading: carregandoHorarios } = useHorariosDisponiveis(
    barbeiroId,
    data,
    servico?.duracaoMinutos ?? 0
  );

  const criar = useCriarAgendamentoBalcao();
  const { mostrarToast } = useToast();

  function reiniciar() {
    setServicoId(null);
    setHorarioEscolhido(null);
    setNomeCliente("");
    setTelefoneCliente("");
    setErro(null);
  }

  function aoFechar() {
    reiniciar();
    onFechar();
  }

  function aoConfirmar() {
    if (!barbeiroId || !servicoId || !horarioEscolhido || !nomeCliente || !telefoneCliente) return;
    setErro(null);
    criar.mutate(
      { barbeiroId, servicoId, inicio: horarioEscolhido, nomeCliente, telefoneCliente },
      {
        onSuccess: () => {
          mostrarToast("Agendamento criado.");
          aoFechar();
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
    <Modal titulo="Novo agendamento" aberto={aberto} onFechar={aoFechar}>
      <div className="flex flex-col gap-3">
        <Select rotulo="Barbeiro" value={barbeiroId ?? ""} onChange={(e) => setBarbeiroId(Number(e.target.value) || null)}>
          <option value="" disabled>
            Escolha
          </option>
          {barbeiros.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </Select>

        <Select rotulo="Serviço" value={servicoId ?? ""} onChange={(e) => setServicoId(Number(e.target.value) || null)}>
          <option value="" disabled>
            Escolha
          </option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </Select>

        <Input rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />

        {barbeiroId && servicoId && (
          <div>
            <p className="mb-1 text-sm text-base-300">Horário</p>
            {carregandoHorarios && <p className="text-sm text-base-300">Carregando...</p>}
            {!carregandoHorarios && horarios && horarios.length === 0 && (
              <p className="text-sm text-base-300">Nenhum horário livre nesse dia.</p>
            )}
            {!carregandoHorarios && horarios && horarios.length > 0 && (
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
        )}

        <Input rotulo="Nome do cliente" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
        <Input
          rotulo="Telefone do cliente"
          type="tel"
          value={telefoneCliente}
          onChange={(e) => setTelefoneCliente(e.target.value)}
          erro={erro ?? undefined}
        />

        <Botao
          onClick={aoConfirmar}
          carregando={criar.isPending}
          disabled={!barbeiroId || !servicoId || !horarioEscolhido || !nomeCliente || !telefoneCliente}
        >
          Criar agendamento
        </Botao>
      </div>
    </Modal>
  );
}
