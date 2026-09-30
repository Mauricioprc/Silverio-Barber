import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Cliente } from "../tipos";

/**
 * Só o total geral de clientes cadastrados (campo `total`, sem paginar — ver
 * `clientes.service.ts`), pro contador do cabeçalho ("128 cadastrados"). Independente
 * do termo de busca digitado: é "quantos existem", não "quantos bateram nesta busca".
 * `limite=1` evita baixar itens que seriam descartados.
 */
export function useTotalClientes(somenteProprios: boolean) {
  return useQuery({
    // Mesmo prefixo ["painel","clientes"] que `useCriarCliente` invalida — ver
    // useClientesInfinito.ts.
    queryKey: ["painel", "clientes", "total", somenteProprios],
    queryFn: async () => {
      const escopo = somenteProprios ? "&escopo=proprio" : "";
      const pagina = await apiFetch<{ clientes: Cliente[]; total: number }>(`/clientes?limite=1&offset=0${escopo}`);
      return pagina.total;
    },
  });
}
