export type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  telefoneVerificado: boolean;
  criadoEm: string;
};

export type AgendamentoDoCliente = {
  id: number;
  barbeiroId: number;
  servicoId: number;
  inicio: string;
  fim: string;
  status: "confirmado" | "cancelado" | "concluido";
  valorCobradoCentavos: number;
};
