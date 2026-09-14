import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { criarClienteSchema, editarClienteSchema } from "./clientes.schema";
import { ClienteNaoEncontradoError, TelefoneJaCadastradoError, criarCliente, editarCliente, listarClientes } from "./clientes.service";

export const clientesRoutes = new Hono<AppContexto>();

// Cadastro é feito pelo balcão/staff (sócio logado) — não é autoatendimento do cliente
// (isso só existe na Fase 4, com página pública própria).
clientesRoutes.use("*", exigirLogin);

clientesRoutes.get("/", async (c) => {
  const busca = c.req.query("busca");
  const lista = await listarClientes(c.get("db"), busca);
  return c.json({ clientes: lista });
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

clientesRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const validacao = await validarCorpo(c, editarClienteSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const cliente = await editarCliente(c.get("db"), id, validacao.dados);
    return c.json({ cliente });
  } catch (erro) {
    if (erro instanceof ClienteNaoEncontradoError) {
      return c.json({ erro: erro.message }, 404);
    }
    if (erro instanceof TelefoneJaCadastradoError) {
      return c.json({ erro: erro.message }, 409);
    }
    throw erro;
  }
});
