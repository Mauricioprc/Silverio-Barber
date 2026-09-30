import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { ERRO_ACESSO_NEGADO, ehDonoOuAdmin } from "../../shared/auth/exigir-dono-ou-admin";
import { atualizarBarbeiroSchema, substituirDisponibilidadeSchema } from "./barbeiros.schema";
import {
  BarbeiroNaoEncontradoError,
  ConflitoComAgendamentoExistenteError,
  atualizarBarbeiro,
  listarBarbeiros,
  listarDisponibilidade,
  substituirDisponibilidade,
} from "./barbeiros.service";

export const barbeirosRoutes = new Hono<AppContexto>();

barbeirosRoutes.use("*", exigirLogin);

// Não-admin recebe só o próprio registro — não uma lista escondida atrás de UI, o
// back-end mesmo já filtra (ver `shared/middleware/exigir-login.ts`, `escopo`).
barbeirosRoutes.get("/", async (c) => {
  const escopo = c.get("escopo")!;
  const lista = await listarBarbeiros(c.get("db"), escopo.admin ? undefined : (escopo.barbeiroId ?? -1));
  return c.json({ barbeiros: lista });
});

barbeirosRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);
  if (!ehDonoOuAdmin(c.get("escopo")!, id)) return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);

  const validacao = await validarCorpo(c, atualizarBarbeiroSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const barbeiro = await atualizarBarbeiro(c.get("db"), id, validacao.dados);
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
  if (!ehDonoOuAdmin(c.get("escopo")!, id)) return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);

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
  if (!ehDonoOuAdmin(c.get("escopo")!, id)) return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);

  const validacao = await validarCorpo(c, substituirDisponibilidadeSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const disponibilidade = await substituirDisponibilidade(c.get("db"), id, validacao.dados);
    return c.json({ disponibilidade });
  } catch (erro) {
    if (erro instanceof BarbeiroNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    if (erro instanceof ConflitoComAgendamentoExistenteError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});
