import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useToast } from "../../../componentes/Toast";
import { mensagemHumana } from "../../../lib/mensagens-erro";
import { useDisponibilidadeBarbeiro, useSalvarDisponibilidade } from "../hooks/useDisponibilidadeBarbeiro";
import type { FaixaDisponibilidade } from "../tipos";

// `diaSemana`: 0=domingo...6=sábado (convenção do banco, ver `db/schema.ts`). Exibida em
// ordem Segunda→Domingo, mais natural pra pensar numa escala de trabalho.
const DIAS = [
  { valor: 1, rotulo: "Segunda" },
  { valor: 2, rotulo: "Terça" },
  { valor: 3, rotulo: "Quarta" },
  { valor: 4, rotulo: "Quinta" },
  { valor: 5, rotulo: "Sexta" },
  { valor: 6, rotulo: "Sábado" },
  { valor: 0, rotulo: "Domingo" },
];

type DiaEditavel = { trabalha: boolean; horaInicio: string; horaFim: string };
type Estado = Record<number, DiaEditavel>;

function estadoInicial(disponibilidade: FaixaDisponibilidade[]): Estado {
  const estado: Estado = {};
  for (const dia of DIAS) {
    const faixa = disponibilidade.find((f) => f.diaSemana === dia.valor);
    estado[dia.valor] = faixa
      ? { trabalha: true, horaInicio: faixa.horaInicio.slice(0, 5), horaFim: faixa.horaFim.slice(0, 5) }
      : { trabalha: false, horaInicio: "09:00", horaFim: "18:00" };
  }
  return estado;
}

export function EditorDisponibilidade({ barbeiroId }: { barbeiroId: number }) {
  const { data: disponibilidade, isLoading } = useDisponibilidadeBarbeiro(barbeiroId);
  const salvar = useSalvarDisponibilidade(barbeiroId);
  const { mostrarToast } = useToast();

  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    if (disponibilidade) setEstado(estadoInicial(disponibilidade));
  }, [disponibilidade]);

  function aoMudarDia(dia: number, campo: keyof DiaEditavel, valor: string | boolean) {
    setEstado((atual) => (atual ? { ...atual, [dia]: { ...atual[dia], [campo]: valor } } : atual));
  }

  function aoSalvar() {
    if (!estado) return;
    const faixas = DIAS.filter((d) => estado[d.valor].trabalha).map((d) => ({
      diaSemana: d.valor,
      horaInicio: estado[d.valor].horaInicio,
      horaFim: estado[d.valor].horaFim,
    }));

    salvar.mutate(faixas, {
      onSuccess: () => mostrarToast("Disponibilidade atualizada."),
      onError: (erro) => mostrarToast(mensagemHumana(erro), "erro"),
    });
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Disponibilidade semanal
      </p>

      {(isLoading || !estado) && <p className="text-sm text-white/50">Carregando horários…</p>}

      {estado && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col divide-y divide-base-600 rounded-lg border border-base-600">
            {DIAS.map((dia) => {
              const valor = estado[dia.valor];
              return (
                <div key={dia.valor} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <label className="flex w-28 shrink-0 items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={valor.trabalha}
                      onChange={(e) => aoMudarDia(dia.valor, "trabalha", e.target.checked)}
                      className="h-4 w-4 rounded border-base-600 bg-base-800 accent-destaque-500"
                    />
                    {dia.rotulo}
                  </label>

                  {valor.trabalha ? (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={valor.horaInicio}
                        onChange={(e) => aoMudarDia(dia.valor, "horaInicio", e.target.value)}
                        aria-label={`Horário de início — ${dia.rotulo}`}
                        className="rounded border border-base-600 bg-base-800 px-2 py-1 text-white outline-none focus:border-destaque-500 focus:ring-1 focus:ring-destaque-500 [color-scheme:dark]"
                      />
                      <span className="text-white/40">até</span>
                      <input
                        type="time"
                        value={valor.horaFim}
                        onChange={(e) => aoMudarDia(dia.valor, "horaFim", e.target.value)}
                        aria-label={`Horário de fim — ${dia.rotulo}`}
                        className="rounded border border-base-600 bg-base-800 px-2 py-1 text-white outline-none focus:border-destaque-500 focus:ring-1 focus:ring-destaque-500 [color-scheme:dark]"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-white/30">Folga</span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={aoSalvar}
            disabled={salvar.isPending}
            className="self-start rounded bg-destaque-500 px-4 py-2 text-sm font-medium text-base-900 transition-colors hover:bg-destaque-400 disabled:opacity-50"
          >
            {salvar.isPending ? "Salvando…" : "Salvar disponibilidade"}
          </button>
        </div>
      )}
    </div>
  );
}
