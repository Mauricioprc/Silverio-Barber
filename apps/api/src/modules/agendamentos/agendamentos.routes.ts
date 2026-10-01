import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { ConflitoHorarioError } from "../../shared/ocupacao/ocupacao.util";
import { ERRO_ACESSO_NEGADO, barbeiroIdForcado } from "../../shared/auth/exigir-dono-ou-admin";
import { criarAgendamentoSchema, editarAgendamentoSchema, listarAgendamentosQuerySchema } from "./agendamentos.schema";
import {
  AcessoNegadoError,
  AgendamentoNaoEncontradoError,
  BarbeiroInvalidoError,
  ClienteInvalidoError,
  ForaDaDisponibilidadeError,
  ServicoInvalidoError,
  ServicoNaoAtendidoPeloBarbeiroError,
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

  // Não-admin: o `barbeiro_id` pedido é ignorado, sempre força o próprio (ver
  // `shared/auth/exigir-dono-ou-admin.ts`) — não dá pra ver a agenda de outro sócio
  // mandando outro id na query.
  const barbeiroId = barbeiroIdForcado(c.get("escopo")!, query.data.barbeiro_id);
  if (barbeiroId === null) return c.json({ erro: "barbeiro_id é obrigatório." }, 400);

  const lista = await listarAgendamentosDoDia(c.get("db"), barbeiroId, query.data.data);
  return c.json({ agendamentos: lista });
});

agendamentosRoutes.post("/", async (c) => {
  const validacao = await validarCorpo(c, criarAgendamentoSchema);
  if (validacao.dados === null) return validacao.resposta;

  // Mesma lógica de força: não-admin só cria agendamento na própria agenda, mesmo que o
  // corpo peça outro `barbeiroId`.
  const barbeiroId = barbeiroIdForcado(c.get("escopo")!, validacao.dados.barbeiroId)!;

  try {
    // `aceitaMensagensAutomaticas: false` explícito (correção pós-auditoria, item 2.1) —
    // este é o caminho de balcão, o cliente não passou pelo opt-in do canal público.
    const agendamento = await criarAgendamento(c.get("db"), {
      ...validacao.dados,
      barbeiroId,
      aceitaMensagensAutomaticas: false,
    });
    return c.json({ agendamento }, 201);
  } catch (erro) {
    if (
      erro instanceof BarbeiroInvalidoError ||
      erro instanceof ServicoInvalidoError ||
      erro instanceof ServicoNaoAtendidoPeloBarbeiroError ||
      erro instanceof ClienteInvalidoError ||
      erro instanceof ForaDaDisponibilidadeError
    ) {
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
    // Checagem de dono acontece dentro do service, na mesma transação que lê o
    // agendamento atual — evita reconsultar e uma corrida entre checar e editar.
    const agendamento = await editarAgendamento(c.get("db"), id, validacao.dados, c.get("escopo")!);
    return c.json({ agendamento });
  } catch (erro) {
    if (erro instanceof AgendamentoNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    if (erro instanceof AcessoNegadoError) {
      return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);
    }
    if (
      erro instanceof BarbeiroInvalidoError ||
      erro instanceof ForaDaDisponibilidadeError ||
      erro instanceof ServicoNaoAtendidoPeloBarbeiroError
    ) {
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
    const escopo = c.get("escopo")!;
    if (!escopo.admin && escopo.barbeiroId !== dados.barbeiroId) {
      return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);
    }
    const url = montarLinkWhatsapp(dados);
    return c.json({ url });
  } catch (erro) {
    if (erro instanceof AgendamentoNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    throw erro;
  }
});
