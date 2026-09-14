import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { criarServicoSchema, editarServicoSchema } from "./servicos.schema";
import { ServicoNaoEncontradoError, criarServico, desativarServico, editarServico, listarServicos } from "./servicos.service";

export const servicosRoutes = new Hono<AppContexto>();

servicosRoutes.use("*", exigirLogin);

servicosRoutes.get("/", async (c) => {
  const apenasAtivos = c.req.query("ativos") === "1";
  const lista = await listarServicos(c.get("db"), apenasAtivos);
  return c.json({ servicos: lista });
});

servicosRoutes.post("/", async (c) => {
  const validacao = await validarCorpo(c, criarServicoSchema);
  if (validacao.dados === null) return validacao.resposta;

  const servico = await criarServico(c.get("db"), validacao.dados);
  return c.json({ servico }, 201);
});

servicosRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const validacao = await validarCorpo(c, editarServicoSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const servico = await editarServico(c.get("db"), id, validacao.dados);
    return c.json({ servico });
  } catch (erro) {
    if (erro instanceof ServicoNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});

servicosRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  try {
    const servico = await desativarServico(c.get("db"), id);
    return c.json({ servico });
  } catch (erro) {
    if (erro instanceof ServicoNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});
