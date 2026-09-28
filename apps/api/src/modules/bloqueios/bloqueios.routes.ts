import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { ConflitoHorarioError } from "../../shared/ocupacao/ocupacao.util";
import { ERRO_ACESSO_NEGADO, barbeiroIdForcado } from "../../shared/auth/exigir-dono-ou-admin";
import { criarBloqueioSchema } from "./bloqueios.schema";
import {
  AcessoNegadoError,
  BarbeiroInvalidoError,
  BloqueioNaoEncontradoError,
  criarBloqueio,
  listarBloqueios,
  removerBloqueio,
} from "./bloqueios.service";

export const bloqueiosRoutes = new Hono<AppContexto>();

bloqueiosRoutes.use("*", exigirLogin);

bloqueiosRoutes.get("/", async (c) => {
  const barbeiroIdTexto = c.req.query("barbeiro_id");
  const barbeiroIdPedido = barbeiroIdTexto !== undefined ? Number(barbeiroIdTexto) : null;
  if (barbeiroIdPedido !== null && !Number.isInteger(barbeiroIdPedido)) {
    return c.json({ erro: "barbeiro_id inválido." }, 400);
  }

  // Não-admin: força o próprio, ignora o que veio na query (mesma regra de agenda/financeiro).
  const barbeiroId = barbeiroIdForcado(c.get("escopo")!, barbeiroIdPedido);
  const lista = await listarBloqueios(c.get("db"), barbeiroId ?? undefined);
  return c.json({ bloqueios: lista });
});

bloqueiosRoutes.post("/", async (c) => {
  const validacao = await validarCorpo(c, criarBloqueioSchema);
  if (validacao.dados === null) return validacao.resposta;

  const barbeiroId = barbeiroIdForcado(c.get("escopo")!, validacao.dados.barbeiroId)!;

  try {
    const bloqueio = await criarBloqueio(c.get("db"), { ...validacao.dados, barbeiroId });
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
    const bloqueio = await removerBloqueio(c.get("db"), id, c.get("escopo")!);
    return c.json({ bloqueio });
  } catch (erro) {
    if (erro instanceof BloqueioNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    if (erro instanceof AcessoNegadoError) {
      return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);
    }
    throw erro;
  }
});
