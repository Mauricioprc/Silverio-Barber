import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { paginacaoQuerySchema } from "../../shared/http/paginacao.schema";
import { ERRO_ACESSO_NEGADO } from "../../shared/auth/exigir-dono-ou-admin";
import { criarClienteSchema, editarClienteSchema, listarClientesQuerySchema } from "./clientes.schema";
import {
  AcessoNegadoError,
  ClienteNaoEncontradoError,
  TelefoneJaCadastradoError,
  criarCliente,
  editarCliente,
  listarAgendamentosDoCliente,
  listarClientes,
} from "./clientes.service";

export const clientesRoutes = new Hono<AppContexto>();

// Cadastro é feito pelo balcão/staff (sócio logado) — não é autoatendimento do cliente
// (isso só existe na Fase 4, com página pública própria).
clientesRoutes.use("*", exigirLogin);

clientesRoutes.get("/", async (c) => {
  const query = listarClientesQuerySchema.safeParse({
    busca: c.req.query("busca"),
    escopo: c.req.query("escopo"),
    limite: c.req.query("limite"),
    offset: c.req.query("offset"),
  });
  if (!query.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: query.error.flatten() }, 400);
  }

  // `escopo=proprio` só tem efeito pra quem não é admin (ver comentário no schema) — a
  // busca do balcão (sem esse parâmetro) nunca é restringida, pra qualquer sócio.
  const escopoAuth = c.get("escopo")!;
  const filtroBarbeiroId = query.data.escopo === "proprio" && !escopoAuth.admin ? (escopoAuth.barbeiroId ?? undefined) : undefined;

  const { itens, total } = await listarClientes(c.get("db"), query.data, query.data.busca, filtroBarbeiroId);
  return c.json({ clientes: itens, total, limite: query.data.limite, offset: query.data.offset });
});

clientesRoutes.post("/", async (c) => {
  const validacao = await validarCorpo(c, criarClienteSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const cliente = await criarCliente(c.get("db"), validacao.dados);
    return c.json({ cliente }, 201);
  } catch (erro) {
    if (erro instanceof TelefoneJaCadastradoError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});

clientesRoutes.get("/:id/agendamentos", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const paginacao = paginacaoQuerySchema.safeParse({
    limite: c.req.query("limite"),
    offset: c.req.query("offset"),
  });
  if (!paginacao.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: paginacao.error.flatten() }, 400);
  }

  // Histórico também respeita o escopo: sócio não-admin só vê os agendamentos desse
  // cliente que são dele, mesmo se o cliente também for atendido pelo outro sócio.
  const escopoAuth = c.get("escopo")!;
  const filtroBarbeiroId = escopoAuth.admin ? undefined : (escopoAuth.barbeiroId ?? undefined);

  const { itens, total } = await listarAgendamentosDoCliente(
    c.get("db"),
    id,
    paginacao.data.limite,
    paginacao.data.offset,
    filtroBarbeiroId
  );
  return c.json({ agendamentos: itens, total, limite: paginacao.data.limite, offset: paginacao.data.offset });
});

clientesRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const validacao = await validarCorpo(c, editarClienteSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const cliente = await editarCliente(c.get("db"), id, validacao.dados, c.get("escopo")!);
    return c.json({ cliente });
  } catch (erro) {
    if (erro instanceof ClienteNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    if (erro instanceof AcessoNegadoError) {
      return c.json({ erro: ERRO_ACESSO_NEGADO }, 403);
    }
    if (erro instanceof TelefoneJaCadastradoError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});
