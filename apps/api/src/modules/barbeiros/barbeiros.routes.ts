import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { atualizarBarbeiroSchema, substituirDisponibilidadeSchema } from "./barbeiros.schema";
import {
  BarbeiroNaoEncontradoError,
  atualizarAtivoBarbeiro,
  listarBarbeiros,
  listarDisponibilidade,
  substituirDisponibilidade,
} from "./barbeiros.service";

export const barbeirosRoutes = new Hono<AppContexto>();

barbeirosRoutes.use("*", exigirLogin);

barbeirosRoutes.get("/", async (c) => {
  const lista = await listarBarbeiros(c.get("db"));
  return c.json({ barbeiros: lista });
});

barbeirosRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const validacao = await validarCorpo(c, atualizarBarbeiroSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const barbeiro = await atualizarAtivoBarbeiro(c.get("db"), id, validacao.dados.ativo);
    return c.json({ barbeiro });
  } catch (erro) {
    if (erro instanceof BarbeiroNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});

barbeirosRoutes.get("/:id/disponibilidade", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  try {
    const disponibilidade = await listarDisponibilidade(c.get("db"), id);
    return c.json({ disponibilidade });
  } catch (erro) {
    if (erro instanceof BarbeiroNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});

barbeirosRoutes.put("/:id/disponibilidade", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const validacao = await validarCorpo(c, substituirDisponibilidadeSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const disponibilidade = await substituirDisponibilidade(c.get("db"), id, validacao.dados);
    return c.json({ disponibilidade });
  } catch (erro) {
    if (erro instanceof BarbeiroNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});
