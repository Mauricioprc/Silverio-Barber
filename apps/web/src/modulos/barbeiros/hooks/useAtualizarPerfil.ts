import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";
import { CHAVE_QUERY_EU } from "../../../contextos/auth-socio-context";

type AtualizarPerfilInput = { nome?: string; telefone?: string; senhaAtual?: string };

/**
 * `PUT /auth/me` — edita o próprio nome/telefone (não é escopo de `barbeiros`, é da
 * identidade em `usuarios`). Invalida `auth-socio/eu` (nome exibido no header/sidebar) e
 * a lista de barbeiros (o nome também aparece lá, via join com `usuarios`).
 */
export function useAtualizarPerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: AtualizarPerfilInput) => apiFetch("/auth/me", { method: "PUT", corpo: dados }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAVE_QUERY_EU });
      queryClient.invalidateQueries({ queryKey: ["painel", "barbeiros"] });
    },
  });
}
