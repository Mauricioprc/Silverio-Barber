import type { Context } from "hono";

/**
 * Extrai o IP real do cliente. Cloudflare popula `CF-Connecting-IP` (mais confiável que
 * `X-Forwarded-For`, que pode ser forjado por proxies intermediários não confiáveis) —
 * movido para `shared/` (correção pós-auditoria) porque agora mais de um módulo precisa
 * (verificação, login de sócio, login de cliente, cadastro público — ver
 * `shared/rate-limit/rate-limite.util.ts`), não só `verificacao.routes.ts`.
 */
export function obterIp(c: Context): string {
  return c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "desconhecido";
}
