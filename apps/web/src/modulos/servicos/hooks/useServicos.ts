import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { ServicoInterno } from "../tipos";

/** Lista ativos e inativos (sem `?ativos=1`) — a tela de Serviços precisa mostrar os desativados para permitir reativar. */
export function useServicos() {
  return useQuery({
    queryKey: ["painel", "servicos", "todos"],
    queryFn: async () => {
      const { servicos } = await apiFetch<{ servicos: ServicoInterno[] }>("/servicos");
      return servicos;
    },
  });
}
