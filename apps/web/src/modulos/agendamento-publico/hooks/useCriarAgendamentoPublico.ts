import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../../lib/api-client";
import type { Agendamento } from "../tipos";

type Entrada = { barbeiroId: number; servicoId: number; inicio: string; aceitaMensagensAutomaticas: boolean };

export function useCriarAgendamentoPublico() {
  return useMutation({
    mutationFn: (dados: Entrada) =>
      apiFetch<{ agendamento: Agendamento }>("/publico/agendamentos", { method: "POST", corpo: dados }).then(
        (r) => r.agendamento
      ),
  });
}

export function precisaVerificar(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 403 && erro.corpo?.precisaVerificar === true;
}

export function conflitoDeHorario(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 409;
}
