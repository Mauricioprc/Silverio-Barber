import { z } from "zod";
import { horarioLocalSchema } from "@silverio/shared";

/** Completa segundos (":00") quando ausentes, só para comparar/normalizar strings de horário. */
function comSegundos(horario: string): string {
  return horario.length === 16 ? `${horario}:00` : horario;
}

export const criarBloqueioSchema = z
  .object({
    barbeiroId: z.number().int().positive(),
    inicio: horarioLocalSchema,
    fim: horarioLocalSchema,
    motivo: z.string().trim().max(200).optional(),
  })
  .refine((dados) => comSegundos(dados.fim) > comSegundos(dados.inicio), {
    message: "fim precisa ser maior que inicio.",
    path: ["fim"],
  });

export type CriarBloqueioInput = z.infer<typeof criarBloqueioSchema>;
