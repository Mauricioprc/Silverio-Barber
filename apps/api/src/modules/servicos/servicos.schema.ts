import { z } from "zod";

export const criarServicoSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120),
  descricao: z.string().trim().max(500).optional(),
  valorCentavos: z.number().int().positive("Valor precisa ser maior que zero."),
  duracaoMinutos: z.number().int().positive("Duração precisa ser maior que zero."),
});

export const editarServicoSchema = criarServicoSchema.partial();

export const listarServicosQuerySchema = z.object({
  ativos: z.enum(["1", "0"]).optional(),
});

export type CriarServicoInput = z.infer<typeof criarServicoSchema>;
export type EditarServicoInput = z.infer<typeof editarServicoSchema>;
