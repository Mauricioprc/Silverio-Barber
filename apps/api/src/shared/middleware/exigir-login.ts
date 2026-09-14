import { createMiddleware } from "hono/factory";
import { getSignedCookie } from "hono/cookie";
import type { AppContexto } from "../tipos";
import { NOME_COOKIE_SESSAO, obterUsuarioDaSessao } from "../sessao/sessao.util";

/**
 * Middleware que exige uma sessão válida. Popula `c.set("usuarioId", ...)` para as
 * rotas seguintes e responde 401 se não houver cookie de sessão (assinado — regra 2 do
 * documento de convenções) válido ou se ele estiver expirado/inválido.
 */
export const exigirLogin = createMiddleware<AppContexto>(async (c, next) => {
  const token = await getSignedCookie(c, c.env.SESSAO_SECRETO, NOME_COOKIE_SESSAO);

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
