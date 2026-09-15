export type BarbeiroInterno = { id: number; usuarioId: number; ativo: boolean; nome: string; telefone: string };

export type ServicoInterno = {
  id: number;
  nome: string;
  descricao: string | null;
  valorCentavos: number;
  duracaoMinutos: number;
  ativo: boolean;
};

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
