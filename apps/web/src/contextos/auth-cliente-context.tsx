import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api-client";

type Cliente = { id: number; nome: string; telefone: string; telefoneVerificado: boolean };

type AuthClienteContextValor = {
  cliente: Cliente | null;
  carregando: boolean;
  identificar: (nome: string, telefone: string, senha: string) => Promise<Cliente>;
  login: (telefone: string, senha: string) => Promise<Cliente>;
  logout: () => Promise<void>;
};

/**
 * Contexto de autenticação do cliente. Isolado de `AuthSocioContext` de propósito (ver
 * documento de convenções) — nunca compartilhar estado entre os dois.
 *
 * `identificar` chama `/publico/clientes/cadastro`, que tanto cria conta nova quanto
 * vincula a um telefone já cadastrado pelo balcão (Fase 3) sem sobrescrever nada até a
 * verificação por WhatsApp real (ver `clientes-publico.service.ts` no back-end) — por
 * isso o fluxo de agendamento público (Fase 2) sempre chama esse endpoint, nunca
 * `login`, mesmo para quem já tem conta: o próprio back-end decide se vincula ou cria.
 */
const AuthClienteContext = createContext<AuthClienteContextValor | null>(null);

const CHAVE_QUERY_EU = ["auth-cliente", "eu"] as const;

async function buscarEu(): Promise<Cliente | null> {
  try {
    const { cliente } = await apiFetch<{ cliente: Cliente }>("/publico/clientes/eu");
    return cliente;
  } catch (erro) {
    if (erro instanceof ApiError && (erro.status === 401 || erro.status === 404)) {
      return null;
    }
    throw erro;
  }
}

export function AuthClienteProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: cliente, isLoading } = useQuery({
    queryKey: CHAVE_QUERY_EU,
    queryFn: buscarEu,
    staleTime: Infinity,
    retry: false,
  });

  /**
   * Busca "/eu" na hora e escreve no cache, em vez de só `invalidateQueries` — quem chama
   * `identificar`/`login` (ver `EtapaDados.tsx`) precisa do `Cliente` (principalmente
   * `telefoneVerificado`) imediatamente ao continuar o fluxo, sem esperar um novo render
   * para ler do contexto.
   */
  const identificar = useCallback(
    async (nome: string, telefone: string, senha: string) => {
      await apiFetch("/publico/clientes/cadastro", { method: "POST", corpo: { nome, telefone, senha } });
      const clienteAtual = await buscarEu();
      queryClient.setQueryData(CHAVE_QUERY_EU, clienteAtual);
      if (!clienteAtual) {
        throw new Error("Cadastro concluído mas sessão não foi reconhecida — tente novamente.");
      }
      return clienteAtual;
    },
    [queryClient]
  );

  const login = useCallback(
    async (telefone: string, senha: string) => {
      await apiFetch("/publico/clientes/login", { method: "POST", corpo: { telefone, senha } });
      const clienteAtual = await buscarEu();
      queryClient.setQueryData(CHAVE_QUERY_EU, clienteAtual);
      if (!clienteAtual) {
        throw new Error("Login concluído mas sessão não foi reconhecida — tente novamente.");
      }
      return clienteAtual;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await apiFetch("/publico/clientes/logout", { method: "POST" });
    queryClient.setQueryData(CHAVE_QUERY_EU, null);
  }, [queryClient]);

  const valor = useMemo(
    () => ({ cliente: cliente ?? null, carregando: isLoading, identificar, login, logout }),
    [cliente, isLoading, identificar, login, logout]
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
