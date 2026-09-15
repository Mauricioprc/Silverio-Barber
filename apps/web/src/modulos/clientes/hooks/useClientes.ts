import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Cliente } from "../tipos";

/** Sem busca digitada, não lista o cadastro inteiro — evita descarregar a tabela toda à toa. */
export function useClientes(busca: string) {
  return useQuery({
    queryKey: ["painel", "clientes", busca],
    queryFn: async () => {
      const { clientes } = await apiFetch<{ clientes: Cliente[]; total: number }>(
        `/clientes?busca=${encodeURIComponent(busca)}&limite=20`
      );
      return clientes;
    },
    enabled: busca.trim().length > 0,
  });
}
