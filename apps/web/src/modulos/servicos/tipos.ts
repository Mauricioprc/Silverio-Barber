export type ServicoInterno = {
  id: number;
  nome: string;
  descricao: string | null;
  valorCentavos: number;
  duracaoMinutos: number;
  ativo: boolean;
};

/** "Quem faz" um serviço (Fase D2) — só barbeiros com vínculo ativo. */
export type BarbeiroDoServico = { id: number; nome: string };

/** Catálogo inteiro com o vínculo do barbeiro logado/selecionado (Fase D2, "Meus serviços"). */
export type ServicoComVinculo = {
  id: number;
  nome: string;
  valorCentavos: number;
  duracaoMinutos: number;
  ativoNoCatalogo: boolean;
  vinculado: boolean;
};
