import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { ConflitoHorarioError } from "../../shared/ocupacao/ocupacao.util";
import { criarAgendamentoSchema, editarAgendamentoSchema, listarAgendamentosQuerySchema } from "./agendamentos.schema";
import {
  AgendamentoNaoEncontradoError,
  BarbeiroInvalidoError,
  ClienteInvalidoError,
  ServicoInvalidoError,
  criarAgendamento,
  editarAgendamento,
  listarAgendamentosDoDia,
  obterDadosParaMensagem,
} from "./agendamentos.service";
import { montarLinkWhatsapp } from "./mensagemManual.util";

export const agendamentosRoutes = new Hono<AppContexto>();

agendamentosRoutes.use("*", exigirLogin);

agendamentosRoutes.get("/", async (c) => {
  const query = listarAgendamentosQuerySchema.safeParse({
    barbeiro_id: c.req.query("barbeiro_id"),
    data: c.req.query("data"),
  });
  if (!query.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: query.error.flatten() }, 400);
  }

  const lista = await listarAgendamentosDoDia(c.get("db"), query.data.barbeiro_id, query.data.data);
  return c.json({ agendamentos: lista });
});

agendamentosRoutes.post("/", async (c) => {
  const validacao = await validarCorpo(c, criarAgendamentoSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    // `aceitaMensagensAutomaticas: false` explícito (correção pós-auditoria, item 2.1) —
    // este é o caminho de balcão, o cliente não passou pelo opt-in do canal público.
    const agendamento = await criarAgendamento(c.get("db"), { ...validacao.dados, aceitaMensagensAutomaticas: false });
    return c.json({ agendamento }, 201);
  } catch (erro) {
    if (erro instanceof BarbeiroInvalidoError || erro instanceof ServicoInvalidoError || erro instanceof ClienteInvalidoError) {
      return c.json({ erro: erro.message }, 400);
    }
    if (erro instanceof ConflitoHorarioError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});

agendamentosRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const validacao = await validarCorpo(c, editarAgendamentoSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const agendamento = await editarAgendamento(c.get("db"), id, validacao.dados);
    return c.json({ agendamento });
  } catch (erro) {
    if (erro instanceof AgendamentoNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    if (erro instanceof BarbeiroInvalidoError) {
      return c.json({ erro: erro.message }, 400);
    }
    if (erro instanceof ConflitoHorarioError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});

// Item 5 da Fase 4 — botão de envio manual, independente de EnviadorWhatsapp/regra
// 7/regra 9 (ver mensagemManual.util.ts). Devolve só a URL pronta; abrir o link é
// responsabilidade do frontend.
agendamentosRoutes.get("/:id/link-whatsapp", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  try {
    const dados = await obterDadosParaMensagem(c.get("db"), id);
    const url = montarLinkWhatsapp(dados);
    return c.json({ url });
  } catch (erro) {
    if (erro instanceof AgendamentoNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});
