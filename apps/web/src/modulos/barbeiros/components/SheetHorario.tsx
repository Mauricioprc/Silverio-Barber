import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Utensils, X } from "lucide-react";
import { FolhaInferior } from "../../../componentes/FolhaInferior";
import { Chip } from "../../../componentes/Chip";
import { Botao } from "../../../componentes/Botao";
import { Switch } from "../../../componentes/Switch";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useSalvarDisponibilidade } from "../hooks/useDisponibilidadeBarbeiro";
import { DIAS_ORDEM, todosMesmoHorario } from "../disponibilidade.util";
import type { FaixaDisponibilidade } from "../tipos";

type DiaEditavel = {
  trabalha: boolean;
  horaInicio: string;
  horaFim: string;
  temAlmoco: boolean;
  almocoInicio: string;
  almocoFim: string;
};
type EstadoPorDia = Record<number, DiaEditavel>;

function estadoInicial(disponibilidade: FaixaDisponibilidade[]): EstadoPorDia {
  const estado: EstadoPorDia = {};
  for (const dia of DIAS_ORDEM) {
    const faixa = disponibilidade.find((f) => f.diaSemana === dia.valor);
    estado[dia.valor] = faixa
      ? {
          trabalha: true,
          horaInicio: faixa.horaInicio.slice(0, 5),
          horaFim: faixa.horaFim.slice(0, 5),
          temAlmoco: Boolean(faixa.pausaInicio && faixa.pausaFim),
          almocoInicio: faixa.pausaInicio?.slice(0, 5) ?? "12:00",
          almocoFim: faixa.pausaFim?.slice(0, 5) ?? "13:00",
        }
      : { trabalha: false, horaInicio: "09:00", horaFim: "18:00", temAlmoco: false, almocoInicio: "12:00", almocoFim: "13:00" };
  }
  return estado;
}

const classeCampoHora =
  "campo-autofill-claro h-11 rounded-lg border border-border bg-surface px-2 text-sm text-text outline-none focus:border-gold focus:ring-1 focus:ring-gold";
const classeCampoHoraPequeno = `${classeCampoHora} w-[86px] px-1.5 text-xs`;

type Props = { barbeiroId: number; disponibilidade: FaixaDisponibilidade[]; aberto: boolean; onFechar: () => void };

/**
 * Sheet "Horário de atendimento" (item B3 + D2 do redesenho) — modo simples (padrão) ou
 * por dia, agora com pausa de almoço opcional. Abre direto no modo por dia se os dias
 * trabalhados hoje já têm horário OU almoço diferentes entre si (nunca esconde nem
 * sobrescreve uma diferença existente sem o usuário ver). O payload enviado é o mesmo de
 * sempre, só com pausaInicio/pausaFim a mais quando houver almoço.
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
  const [almocoComum, setAlmocoComum] = useState(() => ({
    ligado: Boolean(disponibilidade[0]?.pausaInicio && disponibilidade[0]?.pausaFim),
    das: disponibilidade[0]?.pausaInicio?.slice(0, 5) ?? "12:00",
    ate: disponibilidade[0]?.pausaFim?.slice(0, 5) ?? "13:00",
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
    setAlmocoComum({
      ligado: Boolean(disponibilidade[0]?.pausaInicio && disponibilidade[0]?.pausaFim),
      das: disponibilidade[0]?.pausaInicio?.slice(0, 5) ?? "12:00",
      ate: disponibilidade[0]?.pausaFim?.slice(0, 5) ?? "13:00",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function abrirModoPorDia() {
    // Sincroniza o modo por dia com o que estava selecionado no modo simples, pra não
    // perder a seleção ao trocar de modo.
    const novoEstado: EstadoPorDia = {};
    for (const dia of DIAS_ORDEM) {
      novoEstado[dia.valor] = diasMarcados.has(dia.valor)
        ? {
            trabalha: true,
            horaInicio: horarioComum.das,
            horaFim: horarioComum.ate,
            temAlmoco: almocoComum.ligado,
            almocoInicio: almocoComum.das,
            almocoFim: almocoComum.ate,
          }
        : { trabalha: false, horaInicio: "09:00", horaFim: "18:00", temAlmoco: false, almocoInicio: "12:00", almocoFim: "13:00" };
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

  function montarFaixas(): { diaSemana: number; horaInicio: string; horaFim: string; pausaInicio?: string; pausaFim?: string }[] {
    if (modo === "simples") {
      return DIAS_ORDEM.filter((d) => diasMarcados.has(d.valor)).map((d) => ({
        diaSemana: d.valor,
        horaInicio: horarioComum.das,
        horaFim: horarioComum.ate,
        ...(almocoComum.ligado ? { pausaInicio: almocoComum.das, pausaFim: almocoComum.ate } : {}),
      }));
    }
    return DIAS_ORDEM.filter((d) => estado[d.valor].trabalha).map((d) => ({
      diaSemana: d.valor,
      horaInicio: estado[d.valor].horaInicio,
      horaFim: estado[d.valor].horaFim,
      ...(estado[d.valor].temAlmoco ? { pausaInicio: estado[d.valor].almocoInicio, pausaFim: estado[d.valor].almocoFim } : {}),
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

          <div>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium text-text">
                <Utensils className="h-4 w-4 text-text-muted" aria-hidden="true" />
                Pausa para almoço
              </p>
              <Switch
                ligado={almocoComum.ligado}
                onMudar={(v) => setAlmocoComum((atual) => ({ ...atual, ligado: v }))}
                rotulo="Pausa para almoço"
              />
            </div>
            {almocoComum.ligado && (
              <div className="mt-2 flex items-center gap-3">
                <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
                  Das
                  <input
                    type="time"
                    value={almocoComum.das}
                    onChange={(e) => setAlmocoComum((atual) => ({ ...atual, das: e.target.value }))}
                    className={classeCampoHora}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
                  Até
                  <input
                    type="time"
                    value={almocoComum.ate}
                    onChange={(e) => setAlmocoComum((atual) => ({ ...atual, ate: e.target.value }))}
                    className={classeCampoHora}
                  />
                </label>
              </div>
            )}
            <p className="mt-1 text-xs text-text-muted">Vale para todos os dias marcados acima.</p>
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
              <div key={dia.valor} className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-2">
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

                {valor.trabalha && (
                  <div className="flex items-center gap-1.5 pl-11">
                    <Utensils className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                    {valor.temAlmoco ? (
                      <>
                        <input
                          type="time"
                          value={valor.almocoInicio}
                          onChange={(e) => aoMudarDia(dia.valor, "almocoInicio", e.target.value)}
                          aria-label={`Início do almoço — ${dia.nome}`}
                          className={classeCampoHoraPequeno}
                        />
                        <span className="shrink-0 text-xs text-text-muted">–</span>
                        <input
                          type="time"
                          value={valor.almocoFim}
                          onChange={(e) => aoMudarDia(dia.valor, "almocoFim", e.target.value)}
                          aria-label={`Fim do almoço — ${dia.nome}`}
                          className={classeCampoHoraPequeno}
                        />
                        <button
                          onClick={() => aoMudarDia(dia.valor, "temAlmoco", false)}
                          aria-label={`Remover almoço — ${dia.nome}`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => aoMudarDia(dia.valor, "temAlmoco", true)}
                        className="flex h-11 items-center gap-1 rounded-lg px-1 text-xs font-medium text-gold-strong hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        Adicionar almoço
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </FolhaInferior>
  );
}
