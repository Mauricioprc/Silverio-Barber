import { Hono, type Context } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { barbeiroIdForcado } from "../../shared/auth/exigir-dono-ou-admin";
import { filtroFinanceiroQuerySchema, type FiltroFinanceiroInput } from "./financeiro.schema";
import { listarLancamentos, obterResumo } from "./financeiro.service";

export const financeiroRoutes = new Hono<AppContexto>();

financeiroRoutes.use("*", exigirLogin);

function validarFiltro(c: Context<AppContexto>) {
  return filtroFinanceiroQuerySchema.safeParse({
    de: c.req.query("de"),
    ate: c.req.query("ate"),
    barbeiro_id: c.req.query("barbeiro_id"),
    limite: c.req.query("limite"),
    offset: c.req.query("offset"),
  });
}

/** Não-admin: `barbeiro_id` sempre vira o próprio, mesmo se vier outro (ou nenhum) na query. */
function comEscopo(c: Context<AppContexto>, filtro: FiltroFinanceiroInput): FiltroFinanceiroInput {
  const barbeiroId = barbeiroIdForcado(c.get("escopo")!, filtro.barbeiro_id ?? null);
  return { ...filtro, barbeiro_id: barbeiroId ?? undefined };
}

financeiroRoutes.get("/resumo", async (c) => {
  const filtro = validarFiltro(c);
  if (!filtro.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: filtro.error.flatten() }, 400);
  }

  const resumo = await obterResumo(c.get("db"), comEscopo(c, filtro.data));
  return c.json(resumo);
});

financeiroRoutes.get("/lancamentos", async (c) => {
  const filtro = validarFiltro(c);
  if (!filtro.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: filtro.error.flatten() }, 400);
  }

  const filtroEscopado = comEscopo(c, filtro.data);
  const { itens, total } = await listarLancamentos(c.get("db"), filtroEscopado);
  return c.json({ lancamentos: itens, total, limite: filtroEscopado.limite, offset: filtroEscopado.offset });
});
