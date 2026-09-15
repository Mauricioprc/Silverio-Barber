import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../../lib/api-client";

/** Envia o código de verificação por WhatsApp para o telefone da sessão do cliente logado. */
export function useEnviarCodigoVerificacao() {
  return useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/publico/clientes/verificacao/enviar", { method: "POST" }),
  });
}

/**
 * Confirma o código digitado. Ao confirmar, invalida "quem sou eu" do cliente — o
 * `telefoneVerificado` muda de `false` para `true`, e o resto do fluxo depende disso.
 */
export function useConfirmarCodigoVerificacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (codigo: string) =>
      apiFetch<{ ok: true }>("/publico/clientes/verificacao/confirmar", { method: "POST", corpo: { codigo } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth-cliente", "eu"] }),
  });
}

export function retryAfterDoErro(erro: unknown): number | null {
  if (erro instanceof ApiError && erro.status === 429) {
    const valor = Number(erro.corpo?.retryAfterSegundos);
    return Number.isFinite(valor) ? valor : 60;
  }
  return null;
}
