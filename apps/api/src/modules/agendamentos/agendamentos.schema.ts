import { z } from "zod";

/**
 * Formato aceito para `inicio`: `"YYYY-MM-DD HH:MM"` ou `"YYYY-MM-DDTHH:MM"`, sem
 * informação de fuso — ver comentário em `db/schema.ts` sobre por que as colunas de
 * horário são `timestamp` sem timezone. Segundos são opcionais.
 */
const horarioLocalSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/,
    'Horário inválido — use o formato "YYYY-MM-DD HH:MM" (sem fuso).'
  );

const telefoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Telefone inválido — use apenas dígitos (com DDD, opcionalmente com +55).");

/**
 * `clienteId` é opcional (Fase 3, não retroativo): quando informado, nome/telefone são
 * preenchidos a partir do cadastro em `clientes` (ver `agendamentos.service.ts`), e
 * `nomeCliente`/`telefoneCliente` do corpo — se vierem — são ignorados. Sem `clienteId`,
 * `nomeCliente`/`telefoneCliente` são obrigatórios (contato avulso, comportamento da
 * Fase 2 inalterado).
 */
export const criarAgendamentoSchema = z
  .object({
    barbeiroId: z.number().int().positive(),
    servicoId: z.number().int().positive(),
    clienteId: z.number().int().positive().optional(),
    nomeCliente: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120).optional(),
    telefoneCliente: telefoneSchema.optional(),
    inicio: horarioLocalSchema,
  })
  .refine((dados) => dados.clienteId !== undefined || (dados.nomeCliente !== undefined && dados.telefoneCliente !== undefined), {
    message: "Informe clienteId, ou nomeCliente e telefoneCliente.",
    path: ["clienteId"],
  });

/** Status possíveis de um agendamento. */
export const statusAgendamentoSchema = z.enum(["confirmado", "cancelado", "concluido"]);

/**
 * PUT de agendamento cobre dois casos, possivelmente juntos: reagendar (`barbeiroId`
 * e/ou `inicio`) e/ou mudar `status`. Pelo menos um campo precisa vir preenchido.
 */
export const editarAgendamentoSchema = z
  .object({
    barbeiroId: z.number().int().positive().optional(),
    inicio: horarioLocalSchema.optional(),
    status: statusAgendamentoSchema.optional(),
  })
  .refine((dados) => dados.barbeiroId !== undefined || dados.inicio !== undefined || dados.status !== undefined, {
    message: "Informe ao menos um campo: barbeiroId, inicio ou status.",
  });

export const listarAgendamentosQuerySchema = z.object({
  barbeiro_id: z.coerce.number().int().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use o formato "YYYY-MM-DD".'),
});

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>;
export type EditarAgendamentoInput = z.infer<typeof editarAgendamentoSchema>;
