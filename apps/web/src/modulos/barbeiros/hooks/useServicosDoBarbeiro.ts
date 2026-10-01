import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import type { ServicoComVinculo } from "../../servicos/tipos";

/**
 * Catálogo inteiro + vínculo deste barbeiro com cada serviço. Usado em "Meus serviços"
 * (Fase D2) e também pra filtrar a lista de serviços oferecidos na Agenda interna
 * (`FormularioAgendamentoBalcao`) — `barbeiroId` pode ser `null` enquanto ninguém foi
 * escolhido ainda, e a busca fica desligada até ter um id real.
 */
export function useServicosDoBarbeiro(barbeiroId: number | null) {
  return useQuery({
    queryKey: ["painel", "barbeiros", barbeiroId, "servicos"],
    queryFn: async () => {
      const { servicos } = await apiFetch<{ servicos: ServicoComVinculo[] }>(`/barbeiros/${barbeiroId}/servicos`);
      return servicos;
    },
    enabled: barbeiroId !== null,
  });
}
