export type BarbeiroInterno = { id: number; usuarioId: number; ativo: boolean; nome: string; usuario: string; telefone: string };

export type FaixaDisponibilidade = { id: number; diaSemana: number; horaInicio: string; horaFim: string };

export type MetricasBarbeiro = { atendimentos: number; faturamentoCentavos: number };
