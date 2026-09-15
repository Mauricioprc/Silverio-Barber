/** Erro padronizado de API — camada de UI decide a mensagem humana a partir de `status`/`codigo`. */
export class ApiError extends Error {
  status: number;
  codigo: string;

  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
    this.codigo = codigo;
  }
}

type Opcoes = Omit<RequestInit, "body" | "credentials"> & { corpo?: unknown };

/**
 * Cliente HTTP central. Toda chamada à API passa por aqui — nunca `fetch` solto em
 * componente (ver documento de convenções). `credentials: 'include'` sempre: a
 * autenticação é 100% via cookie de sessão `HttpOnly`, não há Bearer token neste sistema.
 */
export async function apiFetch<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { corpo, headers, ...resto } = opcoes;

  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      ...resto,
      credentials: "include",
      headers: {
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ApiError(0, "rede_indisponivel", "Não conseguimos conectar. Verifique sua internet e tente novamente.");
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem = (dados && typeof dados === "object" && "erro" in dados ? String(dados.erro) : null) ?? "Algo deu errado do nosso lado. Tente novamente em instantes.";
    throw new ApiError(resposta.status, String(resposta.status), mensagem);
  }

  return dados as T;
}
