import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";

type BarbeiroCatalogo = { id: number; nome: string };

/**
 * Lista completa de barbeiros ativos, pra montar "Quem faz este serviço" (Fase D2).
 * Usa a rota pública (`GET /publico/barbeiros`, sem dados sensíveis — só id+nome) porque
 * `GET /barbeiros` interno filtra pro próprio registro quando quem chama não é admin
 * (ver `exigir-login.ts`) — e Serviços é uma tela sem restrição de admin (qualquer sócio
 * edita qualquer serviço, decisão já confirmada), então precisa ver todo mundo aqui.
 */
export function useBarbeirosCatalogo() {
  return useQuery({
    queryKey: ["servicos", "barbeiros-catalogo"],
    queryFn: async () => {
      const { barbeiros } = await apiFetch<{ barbeiros: BarbeiroCatalogo[] }>("/publico/barbeiros");
      return barbeiros;
    },
    staleTime: 5 * 60_000,
  });
}
