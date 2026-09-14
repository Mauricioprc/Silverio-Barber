import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { AppContexto } from "../tipos";
import { NOME_COOKIE_SESSAO, obterUsuarioDaSessao } from "../sessao/sessao.util";

/**
 * Middleware que exige uma sessão válida. Popula `c.set("usuarioId", ...)` para as
 * rotas seguintes e responde 401 se não houver cookie de sessão ou se ele estiver
 * expirado/inválido.
 */
export const exigirLogin = createMiddleware<AppContexto>(async (c, next) => {
  const token = getCookie(c, NOME_COOKIE_SESSAO);

  if (!token) {
    return c.json({ erro: "Não autenticado." }, 401);
  }

  const usuarioId = await obterUsuarioDaSessao(c.get("db"), token);

  if (!usuarioId) {
    return c.json({ erro: "Sessão inválida ou expirada." }, 401);
  }

  c.set("usuarioId", usuarioId);
  await next();
});
