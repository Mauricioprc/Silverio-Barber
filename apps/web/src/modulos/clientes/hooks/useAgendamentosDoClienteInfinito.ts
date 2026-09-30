import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { AgendamentoDoCliente } from "../tipos";

const ITENS_POR_PAGINA = 20;

/**
 * Hook novo pra `ClienteDetalhePage` — histórico com "Carregar mais" em vez de um
 * limite fixo de 20 (pedido explícito: "quando já tiver muitos atendimentos, ser
 * melhor"). Deixa `useAgendamentosDoCliente.ts` original intocado; nada mais o usa
 * além do `HistoricoCliente` que está sendo substituído por esta tela.
 */
export function useAgendamentosDoClienteInfinito(clienteId: number | null) {
  return useInfiniteQuery({
    queryKey: ["painel", "clientes", clienteId, "agendamentos-infinito"],
    queryFn: async ({ pageParam }) =>
      apiFetch<{ agendamentos: AgendamentoDoCliente[]; total: number }>(
        `/clientes/${clienteId}/agendamentos?limite=${ITENS_POR_PAGINA}&offset=${pageParam}`
      ),
    initialPageParam: 0,
    getNextPageParam: (paginaAtual, todasAsPaginas) => {
      const carregados = todasAsPaginas.reduce((soma, p) => soma + p.agendamentos.length, 0);
      return carregados < paginaAtual.total ? carregados : undefined;
    },
    enabled: clienteId !== null,
  });
}
