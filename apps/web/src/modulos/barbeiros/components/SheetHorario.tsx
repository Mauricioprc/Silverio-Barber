import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Chip } from "../../../componentes/Chip";
import { Botao } from "../../../componentes/Botao";
import { Switch } from "../../../componentes/Switch";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useSalvarDisponibilidade } from "../hooks/useDisponibilidadeBarbeiro";
import { DIAS_ORDEM, todosMesmoHorario } from "../disponibilidade.util";
import type { FaixaDisponibilidade } from "../tipos";

type DiaEditavel = { trabalha: boolean; horaInicio: string; horaFim: string };
type EstadoPorDia = Record<number, DiaEditavel>;

function estadoInicial(disponibilidade: FaixaDisponibilidade[]): EstadoPorDia {
  const estado: EstadoPorDia = {};
  for (const dia of DIAS_ORDEM) {
    const faixa = disponibilidade.find((f) => f.diaSemana === dia.valor);
    estado[dia.valor] = faixa
      ? { trabalha: true, horaInicio: faixa.horaInicio.slice(0, 5), horaFim: faixa.horaFim.slice(0, 5) }
      : { trabalha: false, horaInicio: "09:00", horaFim: "18:00" };
  }
  return estado;
}

const classeCampoHora =
  "campo-autofill-claro h-11 rounded-lg border border-border bg-surface px-2 text-sm text-text outline-none focus:border-gold focus:ring-1 focus:ring-gold";

type Props = { barbeiroId: number; disponibilidade: FaixaDisponibilidade[]; aberto: boolean; onFechar: () => void };

/**
 * Sheet "Horário de atendimento" (item B3) — modo simples (padrão) ou por dia. Abre
 * direto no modo por dia se os dias trabalhados hoje já têm horários diferentes entre
 * si (nunca esconde nem sobrescreve uma diferença existente sem o usuário ver). O
 * payload enviado é exatamente o de hoje: uma entrada {diaSemana, horaInicio, horaFim}
 * por dia trabalhado — dia fora da lista = folga.
 */
export function SheetHorario({ barbeiroId, disponibilidade, aberto, onFechar }: Props) {
  const salvar = useSalvarDisponibilidade(barbeiroId);
  const { mostrarToast } = useToast();

  const [modo, setModo] = useState<"simples" | "porDia">(() => (todosMesmoHorario(disponibilidade) ? "simples" : "porDia"));
  const [estado, setEstado] = useState<EstadoPorDia>(() => estadoInicial(disponibilidade));
  const [diasMarcados, setDiasMarcados] = useState<Set<number>>(() => new Set(disponibilidade.map((f) => f.diaSemana)));
  const [horarioComum, setHorarioComum] = useState(() => ({
    das: disponibilidade[0]?.horaInicio.slice(0, 5) ?? "09:00",
    ate: disponibilidade[0]?.horaFim.slice(0, 5) ?? "18:00",
  }));

  // O componente fica montado o tempo todo (só o sheet abre/fecha) — sem isso, reabrir
  // depois de fechar sem salvar mostraria a edição anterior em vez dos dados reais.
  useEffect(() => {
    if (!aberto) return;
    setModo(todosMesmoHorario(disponibilidade) ? "simples" : "porDia");
    setEstado(estadoInicial(disponibilidade));
    setDiasMarcados(new Set(disponibilidade.map((f) => f.diaSemana)));
    setHorarioComum({
      das: disponibilidade[0]?.horaInicio.slice(0, 5) ?? "09:00",
      ate: disponibilidade[0]?.horaFim.slice(0, 5) ?? "18:00",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function abrirModoPorDia() {
    // Sincroniza o modo por dia com o que estava selecionado no modo simples, pra não
    // perder a seleção ao trocar de modo.
    const novoEstado: EstadoPorDia = {};
    for (const dia of DIAS_ORDEM) {
      novoEstado[dia.valor] = diasMarcados.has(dia.valor)
        ? { trabalha: true, horaInicio: horarioComum.das, horaFim: horarioComum.ate }
        : { trabalha: false, horaInicio: "09:00", horaFim: "18:00" };
    }
    setEstado(novoEstado);
    setModo("porDia");
  }

  function aoMudarDia(dia: number, campo: keyof DiaEditavel, valor: string | boolean) {
    setEstado((atual) => ({ ...atual, [dia]: { ...atual[dia], [campo]: valor } }));
  }

  function aoAlternarDiaSimples(dia: number) {
    setDiasMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(dia)) novo.delete(dia);
      else novo.add(dia);
      return novo;
    });
  }

  function montarFaixas(): { diaSemana: number; horaInicio: string; horaFim: string }[] {
    if (modo === "simples") {
      return DIAS_ORDEM.filter((d) => diasMarcados.has(d.valor)).map((d) => ({
        diaSemana: d.valor,
        horaInicio: horarioComum.das,
        horaFim: horarioComum.ate,
      }));
    }
    return DIAS_ORDEM.filter((d) => estado[d.valor].trabalha).map((d) => ({
      diaSemana: d.valor,
      horaInicio: estado[d.valor].horaInicio,
      horaFim: estado[d.valor].horaFim,
    }));
  }

  function aoSalvar() {
    salvar.mutate(montarFaixas(), {
      onSuccess: () => {
        mostrarToast("Horários atualizados.");
        onFechar();
      },
      onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
    });
  }

  return (
    <FolhaInferior
      titulo={modo === "simples" ? "Horário de atendimento" : "Horário por dia"}
      aberto={aberto}
      onFechar={onFechar}
      rodape={
        <Botao variante="dourada" tamanho="lg" onClick={aoSalvar} carregando={salvar.isPending}>
          Salvar horários
        </Botao>
      }
    >
      {modo === "porDia" && (
        <button
          onClick={() => setModo("simples")}
          className="mb-2 flex h-11 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>
      )}

      {modo === "simples" ? (
        <div className="flex flex-col gap-5 pb-4 pt-1">
          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">Dias em que atende</p>
            <div className="flex flex-wrap gap-2">
              {DIAS_ORDEM.map((dia) => (
                <Chip key={dia.valor} ativo={diasMarcados.has(dia.valor)} onClick={() => aoAlternarDiaSimples(dia.valor)}>
                  {dia.abrev}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">Horário</p>
            <div className="flex items-center gap-3">
              <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
                Das
                <input
                  type="time"
                  value={horarioComum.das}
                  onChange={(e) => setHorarioComum((atual) => ({ ...atual, das: e.target.value }))}
                  className={classeCampoHora}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
                Até
                <input
                  type="time"
                  value={horarioComum.ate}
                  onChange={(e) => setHorarioComum((atual) => ({ ...atual, ate: e.target.value }))}
                  className={classeCampoHora}
                />
              </label>
            </div>
          </div>

          <button
            onClick={abrirModoPorDia}
            className="flex h-11 items-center self-start rounded-lg text-sm font-medium text-gold-strong hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Algum dia é diferente? Ajustar por dia
          </button>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border pb-4">
          {DIAS_ORDEM.map((dia) => {
            const valor = estado[dia.valor];
            return (
              <div key={dia.valor} className="flex items-center gap-2 py-3">
                <Switch ligado={valor.trabalha} onMudar={(v) => aoMudarDia(dia.valor, "trabalha", v)} rotulo={dia.nome} />
                <span className="w-9 shrink-0 text-sm font-medium text-text">{dia.abrev}</span>
                {valor.trabalha ? (
                  <div className="flex flex-1 items-center justify-end gap-1">
                    <input
                      type="time"
                      value={valor.horaInicio}
                      onChange={(e) => aoMudarDia(dia.valor, "horaInicio", e.target.value)}
                      aria-label={`Início — ${dia.nome}`}
                      className={`${classeCampoHora} w-[94px] px-1.5`}
                    />
                    <span className="shrink-0 text-text-muted">–</span>
                    <input
                      type="time"
                      value={valor.horaFim}
                      onChange={(e) => aoMudarDia(dia.valor, "horaFim", e.target.value)}
                      aria-label={`Fim — ${dia.nome}`}
                      className={`${classeCampoHora} w-[94px] px-1.5`}
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-right text-sm text-text-muted">Folga</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </FolhaInferior>
  );
}
