import { z } from "zod";
import { telefoneSchema } from "@silverio/shared";

export const cadastroPublicoSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120),
  telefone: telefoneSchema,
  senha: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres.").max(200),
});

export const loginPublicoSchema = z.object({
  telefone: z.string().trim().min(1, "Telefone é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
});

export type CadastroPublicoInput = z.infer<typeof cadastroPublicoSchema>;
export type LoginPublicoInput = z.infer<typeof loginPublicoSchema>;
