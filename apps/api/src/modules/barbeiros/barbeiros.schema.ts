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

/**
 * `nome` aqui edita `usuarios.nome` (o nome é da conta, não da linha de barbeiro) — é
 * como o admin renomeia outro sócio, já que `PUT /auth/me` só edita a própria conta.
 */
export const atualizarBarbeiroSchema = z
  .object({
    ativo: z.boolean().optional(),
    nome: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120).optional(),
  })
  .refine((dados) => dados.ativo !== undefined || dados.nome !== undefined, {
    message: "Informe ao menos um campo: ativo ou nome.",
  });

export type SubstituirDisponibilidadeInput = z.infer<typeof substituirDisponibilidadeSchema>;
