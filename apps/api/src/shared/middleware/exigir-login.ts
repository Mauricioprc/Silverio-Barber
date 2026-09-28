import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { getSignedCookie } from "hono/cookie";
import { barbeiros, usuarios } from "../../db/schema";
import type { AppContexto } from "../tipos";
import { NOME_COOKIE_SESSAO, obterUsuarioDaSessao } from "../sessao/sessao.util";

/**
 * Middleware que exige uma sessão válida. Popula `c.set("usuarioId", ...)` e
 * `c.set("escopo", ...)` para as rotas seguintes, e responde 401 se não houver cookie de
 * sessão (assinado — regra 2 do documento de convenções) válido ou se ele estiver
 * expirado/inválido.
 *
 * `escopo` é resolvido aqui (uma query em `usuarios` + `barbeiros`) em vez de cada rota
 * refazer essa checagem: `admin` vê/gerencia tudo; sócio comum só o que é dele
 * (`barbeiroId` é o dono dos seus próprios recursos — agenda, financeiro, disponibilidade
 * etc., ver `shared/auth/exigir-dono-ou-admin.ts`). Admin não tem linha em `barbeiros`,
 * por isso `barbeiroId` fica `null` nesse caso.
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

  const [usuario] = await c.get("db").select({ admin: usuarios.admin }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  const [barbeiro] = await c.get("db").select({ id: barbeiros.id }).from(barbeiros).where(eq(barbeiros.usuarioId, usuarioId)).limit(1);

  c.set("usuarioId", usuarioId);
  c.set("escopo", { admin: usuario?.admin ?? false, barbeiroId: barbeiro?.id ?? null });
  await next();
});
