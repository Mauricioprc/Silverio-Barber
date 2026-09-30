import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { Lancamento } from "../tipos";

const LIMITE_POR_PAGINA = 100; // teto do back-end (ver paginacao.schema.ts)

/**
 * `/financeiro/lancamentos` é paginado (limite máx. 100/página) — pra agrupar por dia
 * com subtotal correto (ver front-redesign-fase2-financeiro-clientes.md, item 10),
 * busca todas as páginas do período em vez de confiar só na primeira. Num mês normal
 * isso é uma única requisição; só passa de uma quando o filtro tem mais de 100
 * lançamentos. Nenhum endpoint novo — só reaproveita `limite`/`offset`, que a API já
 * aceita.
 */
export function useLancamentosCompletos(de: string, ate: string, barbeiroId: number | null) {
  return useQuery({
    queryKey: ["painel", "financeiro", "lancamentos-completos", de, ate, barbeiroId],
    queryFn: async () => {
      const itens: Lancamento[] = [];
      let offset = 0;
      let total = 0;

      do {
        const filtroBarbeiro = barbeiroId !== null ? `&barbeiro_id=${barbeiroId}` : "";
        const pagina = await apiFetch<{ lancamentos: Lancamento[]; total: number }>(
          `/financeiro/lancamentos?de=${de}&ate=${ate}${filtroBarbeiro}&limite=${LIMITE_POR_PAGINA}&offset=${offset}`
        );
        itens.push(...pagina.lancamentos);
        total = pagina.total;
        offset += LIMITE_POR_PAGINA;
      } while (itens.length < total);

      return { itens, total };
    },
  });
}
