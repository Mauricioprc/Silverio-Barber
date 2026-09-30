import type { FaixaDisponibilidade } from "./tipos";

// Ordem de exibição Seg→Dom (mais natural pra pensar numa escala de trabalho) — mesma
// convenção já usada em EditorDisponibilidade.tsx. `valor` é o `diaSemana` do banco
// (0=domingo...6=sábado).
export const DIAS_ORDEM = [
  { valor: 1, abrev: "Seg", nome: "Segunda" },
  { valor: 2, abrev: "Ter", nome: "Terça" },
  { valor: 3, abrev: "Qua", nome: "Quarta" },
  { valor: 4, abrev: "Qui", nome: "Quinta" },
  { valor: 5, abrev: "Sex", nome: "Sexta" },
  { valor: 6, abrev: "Sáb", nome: "Sábado" },
  { valor: 0, abrev: "Dom", nome: "Domingo" },
];

export type GrupoDisponibilidade = { diasRotulo: string; horarioRotulo: string; almocoRotulo: string | null };

function rotuloAlmoco(faixa: Pick<FaixaDisponibilidade, "pausaInicio" | "pausaFim"> | null): string | null {
  if (!faixa?.pausaInicio || !faixa?.pausaFim) return null;
  return `${faixa.pausaInicio.slice(0, 5)} – ${faixa.pausaFim.slice(0, 5)}`;
}

function nomesDias(indices: number[]): string {
  const abrevs = indices.map((i) => DIAS_ORDEM[i].abrev);
  if (abrevs.length === 1) return abrevs[0];
  if (abrevs.length === 2) return `${abrevs[0]} e ${abrevs[1]}`;
  return `${abrevs.slice(0, -1).join(", ")} e ${abrevs[abrevs.length - 1]}`;
}

function eContiguo(indices: number[]): boolean {
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Resumo do card-tocável de horário (item B2.4 do redesenho): agrupa os 7 dias por
 * horário idêntico. Dias consecutivos com o mesmo horário viram "Seg a Sex"; dias
 * não-consecutivos com o mesmo horário viram "Seg, Qua e Sex" — por isso o agrupamento é
 * por assinatura (horário igual), não só por sequência.
 */
export function agruparDisponibilidade(faixas: FaixaDisponibilidade[]): GrupoDisponibilidade[] {
  const porDia = DIAS_ORDEM.map((dia) => {
    const faixa = faixas.find((f) => f.diaSemana === dia.valor);
    if (!faixa) return { chave: "folga", horario: "Folga", almoco: null as string | null };
    // O almoço entra na assinatura do grupo — dois dias com o mesmo expediente mas
    // almoço diferente não devem virar "Seg a Sex" com um único horário de almoço errado.
    const almoco = rotuloAlmoco(faixa);
    return {
      chave: `${faixa.horaInicio.slice(0, 5)}-${faixa.horaFim.slice(0, 5)}-${almoco ?? ""}`,
      horario: `${faixa.horaInicio.slice(0, 5)} – ${faixa.horaFim.slice(0, 5)}`,
      almoco,
    };
  });

  const buckets = new Map<string, { horario: string; almoco: string | null; indices: number[] }>();
  porDia.forEach((info, indice) => {
    const bucket = buckets.get(info.chave) ?? { horario: info.horario, almoco: info.almoco, indices: [] };
    bucket.indices.push(indice);
    buckets.set(info.chave, bucket);
  });

  return [...buckets.values()]
    .sort((a, b) => a.indices[0] - b.indices[0])
    .map((bucket) => ({
      diasRotulo:
        eContiguo(bucket.indices) && bucket.indices.length > 1
          ? `${DIAS_ORDEM[bucket.indices[0]].abrev} a ${DIAS_ORDEM[bucket.indices[bucket.indices.length - 1]].abrev}`
          : nomesDias(bucket.indices),
      horarioRotulo: bucket.horario,
      almocoRotulo: bucket.almoco,
    }));
}

/** true se todo dia que trabalha tem exatamente o mesmo horaInicio/horaFim/pausa. */
export function todosMesmoHorario(faixas: FaixaDisponibilidade[]): boolean {
  if (faixas.length <= 1) return true;
  const [primeira, ...resto] = faixas;
  return resto.every(
    (f) =>
      f.horaInicio === primeira.horaInicio &&
      f.horaFim === primeira.horaFim &&
      f.pausaInicio === primeira.pausaInicio &&
      f.pausaFim === primeira.pausaFim
  );
}
