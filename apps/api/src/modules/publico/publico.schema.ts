import { z } from "zod";
import { horarioLocalSchema, dataLocalSchema } from "@silverio/shared";

export const disponibilidadeQuerySchema = z.object({
  barbeiro_id: z.coerce.number().int().positive(),
  data: dataLocalSchema,
});

/**
 * `clienteId` não faz parte do corpo — vem sempre da sessão autenticada
 * (`exigirLoginCliente`), nunca do que o cliente manda (impede agendar em nome de
 * outro cliente). `aceitaMensagensAutomaticas` — regra 9 do documento de convenções —
 * omitido é tratado como `false` na camada de serviço, nunca assumido `true`.
 */
export const agendamentoPublicoSchema = z.object({
  barbeiroId: z.number().int().positive(),
  servicoId: z.number().int().positive(),
  inicio: horarioLocalSchema,
  aceitaMensagensAutomaticas: z.boolean().optional(),
});

export type AgendamentoPublicoInput = z.infer<typeof agendamentoPublicoSchema>;
