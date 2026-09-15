/**
 * Erro padronizado de API — camada de UI decide a mensagem humana a partir de
 * `status`/`codigo`. `corpo` carrega o resto do JSON de erro (ex.: `retryAfterSegundos`,
 * `precisaVerificar`) para os casos em que uma tela precisa de mais que a mensagem.
 */
export class ApiError extends Error {
  status: number;
  codigo: string;
  corpo: Record<string, unknown> | null;

  constructor(status: number, codigo: string, mensagem: string, corpo: Record<string, unknown> | null = null) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
    this.codigo = codigo;
    this.corpo = corpo;
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
    const corpo = dados && typeof dados === "object" ? (dados as Record<string, unknown>) : null;
    const mensagem = (corpo && "erro" in corpo ? String(corpo.erro) : null) ?? "Algo deu errado do nosso lado. Tente novamente em instantes.";
    throw new ApiError(resposta.status, String(resposta.status), mensagem, corpo);
  }

  return dados as T;
}
