export type ServicoInterno = {
  id: number;
  nome: string;
  descricao: string | null;
  valorCentavos: number;
  duracaoMinutos: number;
  ativo: boolean;
};
