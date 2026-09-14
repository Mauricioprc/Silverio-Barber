import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { ConflitoHorarioError } from "../../shared/ocupacao/ocupacao.util";
import { criarBloqueioSchema } from "./bloqueios.schema";
import { BarbeiroInvalidoError, BloqueioNaoEncontradoError, criarBloqueio, listarBloqueios, removerBloqueio } from "./bloqueios.service";

export const bloqueiosRoutes = new Hono<AppContexto>();

bloqueiosRoutes.use("*", exigirLogin);

bloqueiosRoutes.get("/", async (c) => {
  const barbeiroIdTexto = c.req.query("barbeiro_id");
  const barbeiroId = barbeiroIdTexto !== undefined ? Number(barbeiroIdTexto) : undefined;
  if (barbeiroId !== undefined && !Number.isInteger(barbeiroId)) {
    return c.json({ erro: "barbeiro_id inválido." }, 400);
  }

  const lista = await listarBloqueios(c.get("db"), barbeiroId);
  return c.json({ bloqueios: lista });
});

bloqueiosRoutes.post("/", async (c) => {
  const validacao = await validarCorpo(c, criarBloqueioSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const bloqueio = await criarBloqueio(c.get("db"), validacao.dados);
    return c.json({ bloqueio }, 201);
  } catch (erro) {
    if (erro instanceof BarbeiroInvalidoError) {
      return c.json({ erro: erro.message }, 400);
    }
    if (erro instanceof ConflitoHorarioError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});

bloqueiosRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  try {
    const bloqueio = await removerBloqueio(c.get("db"), id);
    return c.json({ bloqueio });
  } catch (erro) {
    if (erro instanceof BloqueioNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});
