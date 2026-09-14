import { z } from "zod";

/** `enviar` não recebe corpo — o telefone é sempre o do cliente da sessão (ver README). */
export const confirmarVerificacaoSchema = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/, "Código inválido — deve ter 6 dígitos."),
});

export type ConfirmarVerificacaoInput = z.infer<typeof confirmarVerificacaoSchema>;
