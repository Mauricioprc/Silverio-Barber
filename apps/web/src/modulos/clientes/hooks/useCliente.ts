import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Cliente } from "../tipos";

/**
 * Busca um único cliente por id — tela de detalhe (`ClienteDetalhePage`, ver
 * front-redesign-fase2-financeiro-clientes.md). Endpoint novo, `GET /clientes/:id`
 * (mesma projeção de colunas seguras da listagem), pra a URL da tela funcionar de
 * verdade (recarregar, voltar, compartilhar o link).
 */
export function useCliente(id: number | null) {
  return useQuery({
    queryKey: ["painel", "clientes", id],
    queryFn: async () => {
      const { cliente } = await apiFetch<{ cliente: Cliente }>(`/clientes/${id}`);
      return cliente;
    },
    enabled: id !== null,
  });
}
