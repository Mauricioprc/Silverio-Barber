import type { Periodo } from "./tipos";

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_NOME = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/** Recorte mínimo decidido para a Fase 4: dia, semana (7 dias corridos) e mês corrente. */
export function calcularIntervalo(periodo: Periodo): { de: string; ate: string } {
  const hoje = hojeISO();
  if (periodo === "dia") return { de: hoje, ate: hoje };
  if (periodo === "semana") return { de: somarDias(hoje, -6), ate: hoje };

  const [ano, mes] = hoje.split("-").map(Number);
  const primeiroDiaDoMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
  return { de: primeiroDiaDoMes, ate: hoje };
}

export function mesAtual(): { ano: number; mes: number } {
  const [ano, mes] = hojeISO().split("-").map(Number);
  return { ano, mes };
}

export function eMesAtual(ano: number, mes: number): boolean {
  const atual = mesAtual();
  return ano === atual.ano && mes === atual.mes;
}

/** true se {ano,mes} é estritamente no futuro em relação ao mês atual. */
export function eMesFuturo(ano: number, mes: number): boolean {
  const atual = mesAtual();
  return ano > atual.ano || (ano === atual.ano && mes > atual.mes);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function primeiroDiaDoMes(ano: number, mes: number): string {
  return `${ano}-${pad2(mes)}-01`;
}

export function ultimoDiaDoMes(ano: number, mes: number): string {
  // Dia 0 do mês seguinte = último dia do mês corrente (aritmética de calendário padrão,
  // sem depender de tabela de dias-por-mês nem calcular bissexto na mão).
  const data = new Date(Date.UTC(ano, mes, 0));
  return `${data.getUTCFullYear()}-${pad2(data.getUTCMonth() + 1)}-${pad2(data.getUTCDate())}`;
}

export function mesAnterior(ano: number, mes: number): { ano: number; mes: number } {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

export function formatarMesAno(ano: number, mes: number): string {
  return `${MESES_NOME[mes - 1]} ${ano}`;
}

export function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${Number(dia)} ${MESES_ABREV[Number(mes) - 1]}`;
}

/**
 * Intervalo [de, ate] pro mês selecionado — o mês atual só conta até hoje (não faz
 * sentido "total do mês" incluir dias que ainda não aconteceram), meses passados
 * contam o mês inteiro.
 */
export function calcularIntervaloMes(ano: number, mes: number): { de: string; ate: string } {
  const de = primeiroDiaDoMes(ano, mes);
  const ate = eMesAtual(ano, mes) ? hojeISO() : ultimoDiaDoMes(ano, mes);
  return { de, ate };
}

export type Referencia = { de: string; ate: string; rotulo: string };

/**
 * Período de referência pra comparação (item 6 do prompt): mesmo intervalo decorrido do
 * mês anterior quando o mês selecionado está em andamento, mês anterior inteiro quando
 * já fechou; dia/semana comparam com o intervalo imediatamente anterior de mesmo
 * tamanho. Só usa parâmetros de data que o endpoint já aceita — nenhuma chamada nova.
 */
export function calcularReferencia(periodo: Periodo, ano: number, mes: number): Referencia {
  if (periodo === "dia") {
    const ontem = somarDias(hojeISO(), -1);
    return { de: ontem, ate: ontem, rotulo: "vs. ontem" };
  }

  if (periodo === "semana") {
    const { de } = calcularIntervalo("semana");
    const ateRef = somarDias(de, -1);
    const deRef = somarDias(ateRef, -6);
    return { de: deRef, ate: ateRef, rotulo: "vs. sem. anterior" };
  }

  const anterior = mesAnterior(ano, mes);

  if (eMesAtual(ano, mes)) {
    const diaAtual = Number(hojeISO().split("-")[2]);
    const deRef = primeiroDiaDoMes(anterior.ano, anterior.mes);
    const ultimoDiaAnterior = Number(ultimoDiaDoMes(anterior.ano, anterior.mes).split("-")[2]);
    const diaFinalRef = Math.min(diaAtual, ultimoDiaAnterior);
    const ateRef = `${anterior.ano}-${pad2(anterior.mes)}-${pad2(diaFinalRef)}`;
    return { de: deRef, ate: ateRef, rotulo: `vs. 1–${diaFinalRef} ${MESES_ABREV[anterior.mes - 1]}` };
  }

  const { de, ate } = calcularIntervaloMes(anterior.ano, anterior.mes);
  return { de, ate, rotulo: `vs. ${MESES_ABREV[anterior.mes - 1]}` };
}

export type Variacao = { percentualTexto: string; direcao: "alta" | "queda" | "neutro" };

/**
 * Sem divisão por zero e sem "Infinity%"/"NaN%" (item 6): se o valor de referência for
 * zero — incluindo quando os dois lados são zero — não dá pra calcular uma variação
 * percentual com significado, então devolve `null` e quem chama omite a linha inteira.
 */
export function calcularVariacao(atual: number, referencia: number): Variacao | null {
  if (referencia === 0) return null;

  const percentual = ((atual - referencia) / referencia) * 100;
  const absoluto = Math.abs(percentual);
  const texto = absoluto > 0 && absoluto < 1 ? "<1%" : `${Math.round(absoluto)}%`;
  const sinal = percentual > 0 ? "+" : percentual < 0 ? "-" : "";
  const direcao = percentual > 0 ? "alta" : percentual < 0 ? "queda" : "neutro";

  return { percentualTexto: `${sinal}${texto}`, direcao };
}
