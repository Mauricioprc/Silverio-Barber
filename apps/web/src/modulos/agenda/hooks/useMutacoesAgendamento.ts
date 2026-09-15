import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../../lib/api-client";
import type { AgendamentoDoDia, StatusAgendamento } from "../tipos";

type CriarAgendamentoBalcaoInput = {
  barbeiroId: number;
  servicoId: number;
  inicio: string;
  clienteId?: number;
  nomeCliente?: string;
  telefoneCliente?: string;
};

/**
 * `aceitaMensagensAutomaticas` propositalmente não existe aqui — o schema de balcão no
 * back-end não aceita esse campo (correção pós-auditoria: cliente de balcão não passou
 * pelo opt-in do canal público, ver escopo da Fase 3).
 */
export function useCriarAgendamentoBalcao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: CriarAgendamentoBalcaoInput) =>
      apiFetch<{ agendamento: AgendamentoDoDia }>("/agendamentos", { method: "POST", corpo: dados }).then((r) => r.agendamento),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel", "agendamentos"] }),
  });
}

type EditarAgendamentoInput = { id: number; barbeiroId?: number; inicio?: string; status?: StatusAgendamento };

export function useEditarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }: EditarAgendamentoInput) =>
      apiFetch<{ agendamento: AgendamentoDoDia }>(`/agendamentos/${id}`, { method: "PUT", corpo: dados }).then(
        (r) => r.agendamento
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel", "agendamentos"] });
      // Marcar/desmarcar `concluido` cria ou remove um lançamento financeiro
      // automaticamente (ver `financeiro.service.ts`) — sem isso, o dashboard
      // financeiro ficava com números desatualizados por até `staleTime` (30s) depois
      // de concluir um agendamento (achado na verificação da Fase 4).
      queryClient.invalidateQueries({ queryKey: ["painel", "financeiro"] });
    },
  });
}

export function useLinkWhatsapp() {
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ url: string }>(`/agendamentos/${id}/link-whatsapp`).then((r) => r.url),
  });
}

export function conflitoDeHorario(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 409;
}
