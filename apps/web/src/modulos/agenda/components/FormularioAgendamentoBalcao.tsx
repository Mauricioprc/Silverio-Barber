import { useState } from "react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Input } from "../../../componentes/Input";
import { Botao } from "../../../componentes/Botao";
import { Chip } from "../../../componentes/Chip";
import { Segmentado } from "../../../componentes/Segmentado";
import { EstadoVazio } from "../../../componentes/EstadoVazio";
import { Skeleton } from "../../../componentes/Skeleton";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useCriarAgendamentoBalcao, conflitoDeHorario } from "../hooks/useMutacoesAgendamento";
import { useHorariosDisponiveis } from "../../agendamento-publico/hooks/useHorariosDisponiveis";
import { SeletorCliente } from "../../clientes/components/SeletorCliente";
import { hojeISO } from "./SeletorData";
import type { Cliente } from "../../clientes/tipos";
import type { BarbeiroInterno, ServicoInterno } from "../tipos";
import type { Intervalo } from "../../agendamento-publico/tipos";

function horaCurta(horarioLocal: string): string {
  return horarioLocal.slice(11, 16);
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return d.toISOString().slice(0, 10);
}

function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

// Agrupamento em Manhã/Tarde/Noite é só apresentação (ver front-redesign-fase0-agenda.md)
// — não muda quais horários a API devolve nem a regra de fatiamento em
// `useHorariosDisponiveis`, só organiza a mesma lista pra exibir.
function agruparPorTurno(horarios: Intervalo[]) {
  const grupos: { titulo: string; itens: Intervalo[] }[] = [
    { titulo: "Manhã", itens: [] },
    { titulo: "Tarde", itens: [] },
    { titulo: "Noite", itens: [] },
  ];
  for (const horario of horarios) {
    const hora = Number(horaCurta(horario.inicio).slice(0, 2));
    if (hora < 12) grupos[0].itens.push(horario);
    else if (hora < 18) grupos[1].itens.push(horario);
    else grupos[2].itens.push(horario);
  }
  return grupos.filter((g) => g.itens.length > 0);
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
 * ver escopo da Fase 3. Agendamento de balcão exige cliente cadastrado (via
 * `SeletorCliente`, nunca nome/telefone avulsos) e nunca manda `aceitaMensagensAutomaticas`
 * — ver `useMutacoesAgendamento.ts`.
 */
export function FormularioAgendamentoBalcao({ aberto, onFechar, barbeiros, servicos, barbeiroInicial, dataInicial }: Props) {
  const [barbeiroId, setBarbeiroId] = useState<number | null>(barbeiroInicial);
  const [servicoId, setServicoId] = useState<number | null>(null);
  const [data, setData] = useState(dataInicial);
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
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
    setClienteSelecionado(null);
    setErro(null);
  }

  function aoFechar() {
    reiniciar();
    onFechar();
  }

  function aoConfirmar() {
    if (!barbeiroId || !servicoId || !horarioEscolhido || !clienteSelecionado) return;
    setErro(null);
    criar.mutate(
      { barbeiroId, servicoId, inicio: horarioEscolhido, clienteId: clienteSelecionado.id },
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

  const barbeiroEscolhido = barbeiros.find((b) => b.id === barbeiroId) ?? null;
  const completo = Boolean(barbeiroId && servicoId && horarioEscolhido && clienteSelecionado);
  const resumo = completo
    ? `${servico?.nome} · ${barbeiroEscolhido?.nome} · ${formatarDataCurta(data)} · ${horaCurta(horarioEscolhido!)}`
    : null;

  return (
    <FolhaInferior
      titulo="Novo agendamento"
      aberto={aberto}
      onFechar={aoFechar}
      rodape={
        <div className="flex flex-col gap-2">
          {resumo && <p className="text-center text-sm text-text-muted">{resumo}</p>}
          <Botao variante="dourada" tamanho="lg" onClick={aoConfirmar} carregando={criar.isPending} disabled={!completo}>
            Criar agendamento
          </Botao>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-4 pt-1">
        <div>
          <p className="mb-2 text-sm font-medium text-text-muted">Cliente</p>
          <SeletorCliente clienteId={clienteSelecionado?.id ?? null} onSelecionar={setClienteSelecionado} />
        </div>

        {barbeiros.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">Barbeiro</p>
            {barbeiros.length <= 3 ? (
              <Segmentado
                valor={barbeiroId !== null ? String(barbeiroId) : null}
                onSelecionar={(valor) => setBarbeiroId(Number(valor))}
                opcoes={barbeiros.map((b) => ({ valor: String(b.id), rotulo: b.nome }))}
              />
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {barbeiros.map((b) => (
                  <Chip key={b.id} ativo={b.id === barbeiroId} onClick={() => setBarbeiroId(b.id)}>
                    {b.nome}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-text-muted">Serviço</p>
          <div className="flex flex-col gap-2">
            {servicos.map((s) => {
              const selecionado = s.id === servicoId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServicoId(s.id);
                    setHorarioEscolhido(null);
                  }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    selecionado ? "border-gold bg-gold-soft" : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  <span className={`font-medium ${selecionado ? "text-gold-strong" : "text-text"}`}>{s.nome}</span>
                  <span className={`text-sm ${selecionado ? "text-gold-strong" : "text-text-muted"}`}>
                    {s.duracaoMinutos} min · {formatarReais(s.valorCentavos)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-muted">Data</p>
          <div className="mb-2 flex gap-2">
            <Chip ativo={data === hojeISO()} onClick={() => setData(hojeISO())}>
              Hoje
            </Chip>
            <Chip ativo={data === somarDias(hojeISO(), 1)} onClick={() => setData(somarDias(hojeISO(), 1))}>
              Amanhã
            </Chip>
          </div>
          <Input
            variante="clara"
            rotulo="Data do agendamento"
            type="date"
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setHorarioEscolhido(null);
            }}
          />
        </div>

        {barbeiroId && servicoId && (
          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">Horário</p>
            {carregandoHorarios && <Skeleton className="h-11 w-full" />}
            {!carregandoHorarios && horarios && horarios.length === 0 && (
              <EstadoVazio titulo="Nenhum horário livre nesse dia." />
            )}
            {!carregandoHorarios && horarios && horarios.length > 0 && (
              <div className="flex flex-col gap-3">
                {agruparPorTurno(horarios).map((grupo) => (
                  <div key={grupo.titulo}>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{grupo.titulo}</p>
                    <div className="flex flex-wrap gap-2">
                      {grupo.itens.map((h) => (
                        <Chip key={h.inicio} ativo={horarioEscolhido === h.inicio} onClick={() => setHorarioEscolhido(h.inicio)}>
                          {horaCurta(h.inicio)}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {erro && <p className="text-sm text-danger">{erro}</p>}
      </div>
    </FolhaInferior>
  );
}
