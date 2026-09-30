/**
 * Cálculo puro de horários livres/validação de expediente — sem acesso a banco, só
 * aritmética sobre strings de horário. Comparação lexicográfica de string equivale à
 * ordem cronológica porque todo horário nesses formatos tem largura fixa e é
 * zero-padded. Movido de `modules/publico/disponibilidade.util.ts` pra cá (Fase D do
 * redesenho — a validação de expediente/pausa passa a ser usada também por
 * `agendamentos.service.ts`, não só pelo módulo público).
 */
export type Intervalo = { inicio: string; fim: string };

/**
 * Subtrai `ocupados` de `janela`, devolvendo os sub-intervalos livres restantes dentro
 * da janela, em ordem. `ocupados` não precisa vir ordenado nem sem sobreposição entre si
 * (a função não assume isso).
 */
export function subtrairIntervalos(janela: Intervalo, ocupados: Intervalo[]): Intervalo[] {
  const relevantes = ocupados
    .filter((ocupado) => ocupado.fim > janela.inicio && ocupado.inicio < janela.fim)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const livres: Intervalo[] = [];
  let cursor = janela.inicio;

  for (const ocupado of relevantes) {
    const inicioOcupado = ocupado.inicio > cursor ? ocupado.inicio : cursor;
    if (inicioOcupado > cursor) {
      livres.push({ inicio: cursor, fim: inicioOcupado });
    }
    if (ocupado.fim > cursor) {
      cursor = ocupado.fim;
    }
    if (cursor >= janela.fim) break;
  }

  if (cursor < janela.fim) {
    livres.push({ inicio: cursor, fim: janela.fim });
  }

  return livres;
}

/** `true` se os intervalos [aInicio,aFim) e [bInicio,bFim) se sobrepõem (fim exclusivo). */
export function seSobrepoem(aInicio: string, aFim: string, bInicio: string, bFim: string): boolean {
  return aInicio < bFim && aFim > bInicio;
}

export type JanelaDoDia = {
  horaInicio: string;
  horaFim: string;
  pausaInicio: string | null;
  pausaFim: string | null;
};

/**
 * `true` se `[horaInicioAgendamento, horaFimAgendamento)` cabe inteiro dentro do
 * expediente do dia e não cruza a pausa (quando houver). Todos os horários são só
 * "hora do dia" (`HH:MM:SS`), comparáveis entre si porque o agendamento nunca cruza a
 * meia-noite (serviços são de poucas dezenas de minutos).
 */
export function dentroDoExpediente(janela: JanelaDoDia, horaInicioAgendamento: string, horaFimAgendamento: string): boolean {
  if (horaInicioAgendamento < janela.horaInicio || horaFimAgendamento > janela.horaFim) {
    return false;
  }
  if (janela.pausaInicio && janela.pausaFim && seSobrepoem(horaInicioAgendamento, horaFimAgendamento, janela.pausaInicio, janela.pausaFim)) {
    return false;
  }
  return true;
}
