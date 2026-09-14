import { z } from "zod";

export const registrarSocioSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120),
  telefone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Telefone inválido — use apenas dígitos (com DDD, opcionalmente com +55)."),
  senha: z.string().min(8, "Senha precisa ter pelo menos 8 caracteres.").max(200),
});

export const loginSchema = z.object({
  telefone: z.string().trim().min(1, "Telefone é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
});

export type RegistrarSocioInput = z.infer<typeof registrarSocioSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
