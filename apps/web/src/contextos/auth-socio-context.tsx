import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api-client";

type Socio = { id: number; nome: string; telefone: string };

type AuthSocioContextValor = {
  socio: Socio | null;
  carregando: boolean;
  login: (telefone: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * Contexto de autenticação do sócio. Isolado de `AuthClienteContext` de propósito — o
 * back-end trata `usuarios` (sócios) e `clientes` como identidades distintas, com
 * cookies de sessão separados; misturar os dois contextos é a origem mais provável de
 * bug de segurança no front (ver documento de convenções).
 */
const AuthSocioContext = createContext<AuthSocioContextValor | null>(null);

const CHAVE_QUERY_EU = ["auth-socio", "eu"] as const;

export function AuthSocioProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: socio, isLoading } = useQuery({
    queryKey: CHAVE_QUERY_EU,
    queryFn: async () => {
      try {
        const { usuario } = await apiFetch<{ usuario: Socio }>("/auth/eu");
        return usuario;
      } catch (erro) {
        if (erro instanceof ApiError && erro.status === 401) {
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
      await apiFetch("/auth/login", { method: "POST", corpo: { telefone, senha } });
      await queryClient.invalidateQueries({ queryKey: CHAVE_QUERY_EU });
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    queryClient.setQueryData(CHAVE_QUERY_EU, null);
  }, [queryClient]);

  const valor = useMemo(
    () => ({ socio: socio ?? null, carregando: isLoading, login, logout }),
    [socio, isLoading, login, logout]
  );

  return <AuthSocioContext.Provider value={valor}>{children}</AuthSocioContext.Provider>;
}

export function useAuthSocio() {
  const contexto = useContext(AuthSocioContext);
  if (!contexto) {
    throw new Error("useAuthSocio precisa ser usado dentro de AuthSocioProvider.");
  }
  return contexto;
}
