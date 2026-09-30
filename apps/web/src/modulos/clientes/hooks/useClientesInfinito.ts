import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Cliente } from "../tipos";

const ITENS_POR_PAGINA = 50;

/**
 * Hook novo pra `ClientesPage` (ver front-redesign-fase2-financeiro-clientes.md) — a
 * lista agora abre já populada, sem exigir busca (`/clientes` sem `busca` devolve a
 * lista completa, paginada por `limite`/`offset`, com `total` real — ver
 * `clientes.service.ts`). Deixa `useClientes.ts` intocado: `SeletorCliente` (balcão)
 * continua com o comportamento antigo de só buscar quando há termo.
 */
export function useClientesInfinito(busca: string, somenteProprios: boolean) {
  const buscaLimpa = busca.trim();

  return useInfiniteQuery({
    // Prefixo ["painel","clientes"] de propósito: `useCriarCliente` invalida por esse
    // prefixo (ver useCriarCliente.ts) — manter o mesmo prefixo aqui é o que faz a
    // lista atualizar sozinha ao cadastrar, sem precisar tocar na mutation.
    queryKey: ["painel", "clientes", "lista-completa", buscaLimpa, somenteProprios],
    queryFn: async ({ pageParam }) => {
      const escopo = somenteProprios ? "&escopo=proprio" : "";
      const filtroBusca = buscaLimpa.length > 0 ? `&busca=${encodeURIComponent(buscaLimpa)}` : "";
      return apiFetch<{ clientes: Cliente[]; total: number }>(
        `/clientes?limite=${ITENS_POR_PAGINA}&offset=${pageParam}${filtroBusca}${escopo}`
      );
    },
    initialPageParam: 0,
    getNextPageParam: (paginaAtual, todasAsPaginas) => {
      const carregados = todasAsPaginas.reduce((soma, p) => soma + p.clientes.length, 0);
      return carregados < paginaAtual.total ? carregados : undefined;
    },
  });
}
