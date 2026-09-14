import { z } from "zod";

const telefoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Telefone inválido — use apenas dígitos (com DDD, opcionalmente com +55).");

export const criarClienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120),
  telefone: telefoneSchema,
  senha: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres.").max(200),
});

export const editarClienteSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120).optional(),
    telefone: telefoneSchema.optional(),
    senha: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres.").max(200).optional(),
  })
  .refine((dados) => dados.nome !== undefined || dados.telefone !== undefined || dados.senha !== undefined, {
    message: "Informe ao menos um campo: nome, telefone ou senha.",
  });

export const listarClientesQuerySchema = z.object({
  busca: z.string().trim().min(1).optional(),
});

export type CriarClienteInput = z.infer<typeof criarClienteSchema>;
export type EditarClienteInput = z.infer<typeof editarClienteSchema>;
