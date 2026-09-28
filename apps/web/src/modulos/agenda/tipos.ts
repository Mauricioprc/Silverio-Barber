export type { ServicoInterno } from "../servicos/tipos";
export type { BarbeiroInterno } from "../barbeiros/tipos";

export type StatusAgendamento = "confirmado" | "cancelado" | "concluido";

export type AgendamentoDoDia = {
  id: number;
  barbeiroId: number;
  servicoId: number;
  clienteId: number | null;
  nomeCliente: string;
  telefoneCliente: string;
  inicio: string;
  fim: string;
  valorCobradoCentavos: number;
  status: StatusAgendamento;
  aceitaMensagensAutomaticas: boolean;
};

export type Bloqueio = {
  id: number;
  barbeiroId: number;
  inicio: string;
  fim: string;
  motivo: string | null;
};
