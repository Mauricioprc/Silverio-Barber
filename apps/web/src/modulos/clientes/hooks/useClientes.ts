import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Cliente } from "../tipos";

/**
 * Sem busca digitada, não lista o cadastro inteiro — evita descarregar a tabela toda à toa.
 *
 * `somenteProprios` (default `false`) manda `&escopo=proprio`, restringindo a busca aos
 * clientes que o sócio logado já atendeu — usado pela tela de gestão (`ClientesPage`)
 * quando quem está logado não é admin. O balcão (`SeletorCliente`, busca ao criar
 * agendamento) chama sem esse parâmetro de propósito: precisa achar qualquer cliente já
 * cadastrado, mesmo um atendido só pelo outro sócio, senão duplicaria o cadastro.
 */
export function useClientes(busca: string, somenteProprios = false) {
  return useQuery({
    queryKey: ["painel", "clientes", busca, somenteProprios],
    queryFn: async () => {
      const escopo = somenteProprios ? "&escopo=proprio" : "";
      const { clientes } = await apiFetch<{ clientes: Cliente[]; total: number }>(
        `/clientes?busca=${encodeURIComponent(busca)}&limite=20${escopo}`
      );
      return clientes;
    },
    enabled: busca.trim().length > 0,
  });
}
