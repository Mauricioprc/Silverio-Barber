import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../../lib/api-client";
import type { Cliente } from "../tipos";

/**
 * `criarClienteSchema` (back-end) exige `senha` (mín. 8) mesmo pra cadastro feito pelo
 * balcão — não existe um cadastro "sem credencial" na API. Como o cliente de balcão não
 * define senha própria (item 1 do escopo da Fase 4: "sem senha... a menos que opte por
 * isso depois"), o front gera uma senha aleatória que nunca é mostrada nem reaproveitada;
 * se o cliente quiser acessar a própria conta depois, ele passa pelo cadastro público
 * (Fase 2), que já sabe vincular a este telefone sem precisar dessa senha gerada aqui
 * (ver `clientes-publico.service.ts`, fluxo de "vinculado").
 */
function gerarSenhaAleatoria(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export function useCriarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { nome: string; telefone: string }) => {
      const { cliente } = await apiFetch<{ cliente: Cliente }>("/clientes", {
        method: "POST",
        corpo: { ...dados, senha: gerarSenhaAleatoria() },
      });
      return cliente;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["painel", "clientes"] }),
  });
}

export function telefoneJaCadastrado(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 409;
}
