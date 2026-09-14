import type { Context } from "hono";
import type { ZodSchema } from "zod";

/**
 * Lê e valida o corpo JSON da requisição contra um schema Zod. Usado por mais de um
 * módulo (auth, servicos, barbeiros) — por isso vive em `shared/`, não dentro de um
 * módulo específico.
 *
 * Em caso de JSON inválido ou falha de validação, já escreve a resposta 400 e devolve
 * `null` — a rota deve checar `if (dados === null) return resposta` e parar ali.
 */
export async function validarCorpo<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<{ dados: T } | { dados: null; resposta: Response }> {
  let corpo: unknown;
  try {
    corpo = await c.req.json();
  } catch {
    return { dados: null, resposta: c.json({ erro: "Corpo da requisição precisa ser JSON válido." }, 400) };
  }

  const resultado = schema.safeParse(corpo);
  if (!resultado.success) {
    return {
      dados: null,
      resposta: c.json({ erro: "Dados inválidos.", detalhes: resultado.error.flatten() }, 400),
    };
  }

  return { dados: resultado.data };
}
