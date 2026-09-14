import { createMiddleware } from "hono/factory";
import { getSignedCookie } from "hono/cookie";
import type { AppContexto } from "../tipos";
import { NOME_COOKIE_SESSAO_CLIENTE, obterClienteDaSessao } from "../sessao/sessao-cliente.util";

/**
 * Paralelo de `exigir-login.ts`, mas para sessão de cliente — usa o cookie próprio de
 * cliente (`NOME_COOKIE_SESSAO_CLIENTE`), nunca o de sócio. Popula
 * `c.set("clienteId", ...)`. Usada pelas rotas públicas que exigem o cliente logado
 * (ex.: `POST /api/publico/agendamentos`, verificação de telefone).
 */
export const exigirLoginCliente = createMiddleware<AppContexto>(async (c, next) => {
  const token = await getSignedCookie(c, c.env.SESSAO_SECRETO, NOME_COOKIE_SESSAO_CLIENTE);

  if (!token) {
    return c.json({ erro: "Não autenticado." }, 401);
  }

  const clienteId = await obterClienteDaSessao(c.get("db"), token);

  if (!clienteId) {
    return c.json({ erro: "Sessão inválida ou expirada." }, 401);
  }

  c.set("clienteId", clienteId);
  await next();
});
