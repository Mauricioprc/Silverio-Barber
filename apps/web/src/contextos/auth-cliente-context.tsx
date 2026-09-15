import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api-client";

type Cliente = { id: number; nome: string; telefone: string; telefoneVerificado: boolean };

type AuthClienteContextValor = {
  cliente: Cliente | null;
  carregando: boolean;
  login: (telefone: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * Contexto de autenticação do cliente. Isolado de `AuthSocioContext` de propósito (ver
 * documento de convenções) — nunca compartilhar estado entre os dois.
 *
 * A estrutura entra na Fase 1 porque as fases seguintes dependem dela, mas o fluxo real
 * de cliente (cadastro, verificação WhatsApp) é escopo da Fase 2 — a rota "quem sou eu"
 * do cliente (`/api/publico/clientes/eu`) ainda não existe no back-end. Por isso um 404
 * aqui é tratado como "não autenticado" (igual a um 401), sem quebrar a Fase 1.
 */
const AuthClienteContext = createContext<AuthClienteContextValor | null>(null);

const CHAVE_QUERY_EU = ["auth-cliente", "eu"] as const;

export function AuthClienteProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: cliente, isLoading } = useQuery({
    queryKey: CHAVE_QUERY_EU,
    queryFn: async () => {
      try {
        const { cliente } = await apiFetch<{ cliente: Cliente }>("/publico/clientes/eu");
        return cliente;
      } catch (erro) {
        if (erro instanceof ApiError && (erro.status === 401 || erro.status === 404)) {
          return null;
        }
        throw erro;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(
    async (telefone: string, senha: string) => {
      await apiFetch("/publico/clientes/login", { method: "POST", corpo: { telefone, senha } });
      await queryClient.invalidateQueries({ queryKey: CHAVE_QUERY_EU });
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await apiFetch("/publico/clientes/logout", { method: "POST" });
    queryClient.setQueryData(CHAVE_QUERY_EU, null);
  }, [queryClient]);

  const valor = useMemo(
    () => ({ cliente: cliente ?? null, carregando: isLoading, login, logout }),
    [cliente, isLoading, login, logout]
  );

  return <AuthClienteContext.Provider value={valor}>{children}</AuthClienteContext.Provider>;
}

export function useAuthCliente() {
  const contexto = useContext(AuthClienteContext);
  if (!contexto) {
    throw new Error("useAuthCliente precisa ser usado dentro de AuthClienteProvider.");
  }
  return contexto;
}
