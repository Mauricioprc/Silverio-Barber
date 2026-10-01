import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { ServicoInterno } from "../tipos";

type CamposServico = { nome: string; descricao?: string; valorCentavos: number; duracaoMinutos: number };

/** Prefixo compartilhado com `useServicosInternos.ts` (Agenda) — invalidar por aqui atualiza os dois. */
const CHAVE_QUERY = ["painel", "servicos"] as const;

export function useCriarServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: CamposServico) =>
      apiFetch<{ servico: ServicoInterno }>("/servicos", { method: "POST", corpo: dados }).then((r) => r.servico),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY }),
  });
}

type EditarServicoInput = { id: number } & Partial<CamposServico> & { ativo?: boolean };

/** Serve tanto para editar campos quanto para reativar (mandando só `{ativo: true}`). */
export function useEditarServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }: EditarServicoInput) =>
      apiFetch<{ servico: ServicoInterno }>(`/servicos/${id}`, { method: "PUT", corpo: dados }).then((r) => r.servico),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY }),
  });
}

/** Soft delete — o back-end nunca apaga o serviço de verdade (regra do projeto: valor/duração são copiados pros agendamentos). */
export function useDesativarServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ servico: ServicoInterno }>(`/servicos/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY }),
  });
}

/**
 * Liga/desliga o vínculo de um barbeiro com um serviço do catálogo (Fase D2) — usado
 * tanto no sheet de edição de serviço ("Quem faz este serviço") quanto no sheet "Meus
 * serviços" do próprio barbeiro. Invalida a lista de serviços (os avatares na tela de
 * Serviços dependem disso) e as duas consultas específicas de vínculo.
 */
export function useAlternarVinculoServico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barbeiroId, servicoId, ativo }: { barbeiroId: number; servicoId: number; ativo: boolean }) =>
      apiFetch(`/barbeiros/${barbeiroId}/servicos/${servicoId}`, { method: "PUT", corpo: { ativo } }),
    onSuccess: (_dados, variaveis) => {
      queryClient.invalidateQueries({ queryKey: CHAVE_QUERY });
      queryClient.invalidateQueries({ queryKey: ["painel", "servicos", variaveis.servicoId, "barbeiros"] });
      queryClient.invalidateQueries({ queryKey: ["painel", "barbeiros", variaveis.barbeiroId, "servicos"] });
    },
  });
}
