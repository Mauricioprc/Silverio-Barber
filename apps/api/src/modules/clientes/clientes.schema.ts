import { z } from "zod";
import { paginacaoQuerySchema } from "../../shared/http/paginacao.schema";
import { telefoneSchema } from "@silverio/shared";

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

/**
 * `escopo=proprio` é opt-in, só usado pela tela de gestão de clientes (`ClientesPage`) —
 * o balcão (`SeletorCliente`, busca de cliente ao criar agendamento) nunca manda esse
 * parâmetro, de propósito: precisa achar qualquer cliente já cadastrado, mesmo um que só
 * foi atendido pelo outro sócio, senão duplicaria o cadastro (ver `clientes.routes.ts`).
 */
export const listarClientesQuerySchema = z
  .object({
    busca: z.string().trim().min(1).optional(),
    escopo: z.enum(["proprio"]).optional(),
  })
  .merge(paginacaoQuerySchema);

export type CriarClienteInput = z.infer<typeof criarClienteSchema>;
export type EditarClienteInput = z.infer<typeof editarClienteSchema>;
