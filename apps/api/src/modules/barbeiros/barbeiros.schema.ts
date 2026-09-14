import { z } from "zod";

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora inválida — use HH:MM.");

const faixaDisponibilidadeSchema = z
  .object({
    diaSemana: z.number().int().min(0).max(6),
    horaInicio: horaSchema,
    horaFim: horaSchema,
  })
  .refine((faixa) => faixa.horaFim > faixa.horaInicio, {
    message: "horaFim precisa ser maior que horaInicio.",
    path: ["horaFim"],
  });

/** Substitui a disponibilidade semanal inteira do barbeiro por esta lista. */
export const substituirDisponibilidadeSchema = z.object({
  disponibilidade: z.array(faixaDisponibilidadeSchema),
});

export const atualizarBarbeiroSchema = z.object({
  ativo: z.boolean(),
});

export type SubstituirDisponibilidadeInput = z.infer<typeof substituirDisponibilidadeSchema>;
