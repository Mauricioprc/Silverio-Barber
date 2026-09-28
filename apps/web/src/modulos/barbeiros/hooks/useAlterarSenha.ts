import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../../lib/api-client";

type AlterarSenhaInput = { senhaAtual: string; senhaNova: string };

/** `PUT /auth/senha` — troca a própria senha (confere a atual no back-end). */
export function useAlterarSenha() {
  return useMutation({
    mutationFn: (dados: AlterarSenhaInput) => apiFetch<{ ok: true }>("/auth/senha", { method: "PUT", corpo: dados }),
  });
}
