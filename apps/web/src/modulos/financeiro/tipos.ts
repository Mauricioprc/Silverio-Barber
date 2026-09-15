export type ResumoFinanceiro = { totalCentavos: number; barbeiroId: number | null; de: string | null; ate: string | null };

export type Lancamento = { id: number; agendamentoId: number; barbeiroId: number; valorCentavos: number; criadoEm: string };

export type Periodo = "dia" | "semana" | "mes";
