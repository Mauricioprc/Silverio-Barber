import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (falhasAteAgora, erro) => {
        // Não faz sentido tentar de novo automaticamente em erro de validação/autenticação
        // — só em falha de rede ou erro do servidor.
        if (erro instanceof ApiError && erro.status >= 400 && erro.status < 500) {
          return false;
        }
        return falhasAteAgora < 2;
      },
      staleTime: 30_000,
    },
  },
});
