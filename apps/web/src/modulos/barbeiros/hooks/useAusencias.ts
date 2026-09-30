import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import { somarDias } from "../../../lib/periodo";
import type { AgendamentoDoDia, Bloqueio } from "../../agenda/tipos";

const CHAVE_QUERY = (barbeiroId: number) => ["painel", "barbeiros", barbeiroId, "ausencias"] as const;

function agora(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * "Ausência" é uma visão de Bloqueios daquele barbeiro — mesmos endpoints, sem conceito
 * paralelo (Fase A confirmou: bloqueio já aceita barbeiro específico + datetime
 * completo). `GET /bloqueios?barbeiro_id=` devolve passado e futuro sem filtro de data —
 * filtra aqui pra só as futuras/em andamento (`fim` ainda não passou), em ordem
 * cronológica.
 */
export function useAusenciasBarbeiro(barbeiroId: number) {
  return useQuery({
    queryKey: CHAVE_QUERY(barbeiroId),
    queryFn: async () => {
      const { bloqueios } = await apiFetch<{ bloqueios: Bloqueio[] }>(`/bloqueios?barbeiro_id=${barbeiroId}`);
      return bloqueios;
    },
    select: (bloqueios) => {
      const agoraLocal = agora();
      return [...bloqueios].filter((b) => b.fim > agoraLocal).sort((a, b) => a.inicio.localeCompare(b.inicio));
    },
  });
}

type DadosAusencia = { barbeiroId: number; inicio: string; fim: string; motivo?: string };

export function useCriarAusencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosAusencia) =>
      apiFetch<{ bloqueio: Bloqueio }>("/bloqueios", { method: "POST", corpo: dados }).then((r) => r.bloqueio),
    onSuccess: (_dado, variaveis) => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY(variaveis.barbeiroId) }),
  });
}

export function useRemoverAusencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; barbeiroId: number }) => apiFetch(`/bloqueios/${id}`, { method: "DELETE" }),
    onSuccess: (_dado, variaveis) => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY(variaveis.barbeiroId) }),
  });
}

/**
 * "Editar" uma ausência = remover a antiga e criar a nova — `/bloqueios` não tem `PUT`
 * (confirmado na Fase A; só `POST`/`DELETE`), então não há como fazer isso atômico sem
 * mudar o back-end. Se o `POST` falhar depois do `DELETE` ter funcionado, a ausência
 * antiga já foi removida e a nova não foi criada — o erro deixa isso explícito pro
 * usuário tentar de novo, em vez de fingir que foi uma atualização única.
 */
export function useEditarAusencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ idAntigo, dados }: { idAntigo: number; dados: DadosAusencia }) => {
      await apiFetch(`/bloqueios/${idAntigo}`, { method: "DELETE" });
      try {
        return await apiFetch<{ bloqueio: Bloqueio }>("/bloqueios", { method: "POST", corpo: dados }).then(
          (r) => r.bloqueio
        );
      } catch (erro) {
        throw new Error(
          "A ausência anterior foi removida, mas a nova não pôde ser criada. Tente cadastrar de novo.",
          { cause: erro }
        );
      }
    },
    onSuccess: (_dado, variaveis) => queryClient.invalidateQueries({ queryKey: CHAVE_QUERY(variaveis.dados.barbeiroId) }),
  });
}

/**
 * Conta agendamentos não cancelados deste barbeiro que se sobrepõem ao período
 * [inicio, fim) — reaproveita `GET /agendamentos?barbeiro_id&data`, que só aceita um dia
 * por vez (Fase A confirmou: sem endpoint de intervalo), então busca dia a dia dentro do
 * período e filtra por sobreposição real de horário (não só "mesmo dia"), pra cobrir
 * ausência com horário parcial corretamente.
 */
export function useContarConflitos(barbeiroId: number | null, inicio: string | null, fim: string | null) {
  return useQuery({
    queryKey: ["painel", "barbeiros", barbeiroId, "conflitos-ausencia", inicio, fim],
    queryFn: async () => {
      if (!barbeiroId || !inicio || !fim) return 0;
      const dataInicial = inicio.slice(0, 10);
      const dataFinal = fim.slice(0, 10);

      const datas: string[] = [];
      let cursor = dataInicial;
      while (cursor <= dataFinal) {
        datas.push(cursor);
        cursor = somarDias(cursor, 1);
      }

      const paginas = await Promise.all(
        datas.map((data) =>
          apiFetch<{ agendamentos: AgendamentoDoDia[] }>(`/agendamentos?barbeiro_id=${barbeiroId}&data=${data}`).then(
            (r) => r.agendamentos
          )
        )
      );

      return paginas
        .flat()
        .filter((a) => a.status !== "cancelado" && a.inicio < fim && a.fim > inicio).length;
    },
    enabled: barbeiroId !== null && inicio !== null && fim !== null,
  });
}
