import { z } from "zod";

/**
 * Formato de telefone aceito em todo o sistema (auth de sócio, cadastro de cliente,
 * agendamento público) — dígitos com DDD, `+55` opcional. Fonte única: antes desta
 * extração, essa mesma regex existia duplicada em 4 schemas do back-end
 * (`auth.schema.ts`, `agendamentos.schema.ts`, `clientes.schema.ts`,
 * `clientes-publico.schema.ts`).
 */
export const telefoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Telefone inválido — use apenas dígitos (com DDD, opcionalmente com +55).");
