import { z } from "zod";
import { telefoneSchema, usuarioLoginSchema } from "@silverio/shared";

const senhaSchema = z.string().min(8, "Senha precisa ter pelo menos 8 caracteres.").max(200);

export const registrarSocioSchema = z.object({
  nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120),
  usuario: usuarioLoginSchema,
  telefone: telefoneSchema,
  senha: senhaSchema,
});

/** Mesmo formato do bootstrap de sócio — a conta admin só não ganha linha em `barbeiros`. */
export const registrarAdminSchema = registrarSocioSchema;

export const loginSchema = z.object({
  usuario: z.string().trim().min(1, "Usuário é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
});

/**
 * `nome` e `telefone` sozinhos não exigem senha (baixo risco, `telefone` é só contato).
 * Mudar `usuario` — é o login — exige `senhaAtual` pra confirmar; por isso o refine: ou não
 * veio `usuario`, ou veio junto com `senhaAtual`.
 */
export const atualizarMeuPerfilSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120).optional(),
    telefone: telefoneSchema.optional(),
    usuario: usuarioLoginSchema.optional(),
    senhaAtual: z.string().min(1).optional(),
  })
  .refine((dados) => dados.usuario === undefined || dados.senhaAtual !== undefined, {
    message: "Informe a senha atual para trocar o usuário.",
    path: ["senhaAtual"],
  })
  .refine((dados) => dados.nome !== undefined || dados.telefone !== undefined || dados.usuario !== undefined, {
    message: "Informe ao menos um campo: nome, telefone ou usuário.",
  });

export const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, "Senha atual é obrigatória."),
  senhaNova: senhaSchema,
});

export type RegistrarSocioInput = z.infer<typeof registrarSocioSchema>;
export type RegistrarAdminInput = z.infer<typeof registrarAdminSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AtualizarMeuPerfilInput = z.infer<typeof atualizarMeuPerfilSchema>;
export type AlterarSenhaInput = z.infer<typeof alterarSenhaSchema>;
