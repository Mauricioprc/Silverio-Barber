export type Servico = {
  id: number;
  nome: string;
  descricao: string | null;
  valorCentavos: number;
  duracaoMinutos: number;
};

export type Barbeiro = { id: number; nome: string };

export type Intervalo = { inicio: string; fim: string };

export type Agendamento = {
  id: number;
  barbeiroId: number;
  servicoId: number;
  inicio: string;
  fim: string;
  valorCobradoCentavos: number;
  aceitaMensagensAutomaticas: boolean;
};

/**
 * Estado acumulado do fluxo — cada etapa preenche o seu campo, sem apagar o que já foi
 * escolhido nas etapas anteriores (regra do escopo da Fase 2: preservar seleção ao voltar).
 */
export type SelecaoAgendamento = {
  servico: Servico | null;
  barbeiro: Barbeiro | null;
  data: string | null; // "YYYY-MM-DD"
  horario: Intervalo | null;
  aceitaMensagensAutomaticas: boolean;
};

export type Etapa = "servico" | "barbeiro" | "horario" | "dados" | "verificacao" | "revisao" | "confirmacao";

export const ETAPAS: Etapa[] = ["servico", "barbeiro", "horario", "dados", "verificacao", "revisao", "confirmacao"];
