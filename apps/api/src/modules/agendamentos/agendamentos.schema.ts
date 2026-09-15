import { z } from "zod";
import { horarioLocalSchema, telefoneSchema, dataLocalSchema } from "@silverio/shared";

export { horarioLocalSchema };

/**
 * `clienteId` é opcional (Fase 3, não retroativo): quando informado, nome/telefone são
 * preenchidos a partir do cadastro em `clientes` (ver `agendamentos.service.ts`), e
 * `nomeCliente`/`telefoneCliente` do corpo — se vierem — são ignorados. Sem `clienteId`,
 * `nomeCliente`/`telefoneCliente` são obrigatórios (contato avulso, comportamento da
 * Fase 2 inalterado).
 *
 * Este schema é usado só pela rota de balcão (`agendamentos.routes.ts`, sócio logado) —
 * de propósito, NÃO tem `aceitaMensagensAutomaticas` (correção pós-auditoria, ver
 * `07-auditoria-geral-backend.md`, item 2.1): esse campo é opt-in do próprio cliente
 * (regra 9), só existe no schema do canal público (`publico.schema.ts`,
 * `agendamentoPublicoSchema`). Antes desta correção, como `criarAgendamento` aceitava o
 * mesmo campo vindo de qualquer chamador, nada impedia um sócio (ou uma chamada direta à
 * API) de marcar `true` num agendamento de balcão — cujo cliente nunca passou pelo fluxo
 * de consentimento explícito — disparando lembrete automático sem opt-in real. A rota de
 * balcão agora força `aceitaMensagensAutomaticas: false` explicitamente ao chamar o
 * serviço (defesa em profundidade: mesmo que o campo volte a aparecer aqui por engano no
 * futuro, o `false` explícito na rota ainda prevalece).
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
  data: dataLocalSchema,
});

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoSchema>;
export type EditarAgendamentoInput = z.infer<typeof editarAgendamentoSchema>;
