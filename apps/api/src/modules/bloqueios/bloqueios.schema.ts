import { z } from "zod";

const horarioLocalSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/,
    'Horário inválido — use o formato "YYYY-MM-DD HH:MM" (sem fuso).'
  );

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
