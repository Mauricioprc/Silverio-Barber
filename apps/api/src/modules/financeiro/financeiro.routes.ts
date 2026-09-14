import { Hono, type Context } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { filtroFinanceiroQuerySchema } from "./financeiro.schema";
import { listarLancamentos, obterResumo } from "./financeiro.service";

export const financeiroRoutes = new Hono<AppContexto>();

financeiroRoutes.use("*", exigirLogin);

function validarFiltro(c: Context<AppContexto>) {
  return filtroFinanceiroQuerySchema.safeParse({
    de: c.req.query("de"),
    ate: c.req.query("ate"),
    barbeiro_id: c.req.query("barbeiro_id"),
  });
}

financeiroRoutes.get("/resumo", async (c) => {
  const filtro = validarFiltro(c);
  if (!filtro.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: filtro.error.flatten() }, 400);
  }

  const resumo = await obterResumo(c.get("db"), filtro.data);
  return c.json(resumo);
});

financeiroRoutes.get("/lancamentos", async (c) => {
  const filtro = validarFiltro(c);
  if (!filtro.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: filtro.error.flatten() }, 400);
  }

  const lancamentos = await listarLancamentos(c.get("db"), filtro.data);
  return c.json({ lancamentos });
});
