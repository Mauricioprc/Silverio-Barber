import { z } from "zod";

/**
 * Nome de usuário de login do staff (sócio/admin) — não é o telefone, que agora é só
 * contato. Minúsculas, dígitos, ponto, hífen ou underscore, 3-30 caracteres.
 */
export const usuarioLoginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, "Usuário deve ter 3-30 caracteres: letras minúsculas, números, ponto, hífen ou underscore.");
