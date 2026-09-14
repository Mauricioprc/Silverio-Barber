import { Hono, type Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLoginCliente } from "../../shared/middleware/exigir-login-cliente";
import { NOME_COOKIE_SESSAO_CLIENTE, criarSessaoCliente, destruirSessaoCliente } from "../../shared/sessao/sessao-cliente.util";
import { cadastroPublicoSchema, loginPublicoSchema } from "./clientes-publico.schema";
import { CredenciaisInvalidasError, autenticarClientePublico, cadastrarClientePublico } from "./clientes-publico.service";

/**
 * Rotas de auth do **cliente** (`/api/publico/clientes/*`), separadas de
 * `clientes.routes.ts` (que é o CRUD operado pelo sócio/balcão, protegido por
 * `exigirLogin`). Aqui não há `exigirLogin` nenhum nas rotas de cadastro/login — são
 * públicas de propósito, é o próprio cliente entrando sozinho (ver escopo da Fase 4).
 */
export const clientesPublicoRoutes = new Hono<AppContexto>();

async function iniciarSessaoCliente(c: Context<AppContexto>, clienteId: number) {
  const { token, expiraEm } = await criarSessaoCliente(c.get("db"), clienteId);
  await setSignedCookie(c, NOME_COOKIE_SESSAO_CLIENTE, token, c.env.SESSAO_SECRETO, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    expires: expiraEm,
  });
}

clientesPublicoRoutes.post("/cadastro", async (c) => {
  const validacao = await validarCorpo(c, cadastroPublicoSchema);
  if (validacao.dados === null) return validacao.resposta;

  const { id, vinculado } = await cadastrarClientePublico(c.get("db"), validacao.dados);
  await iniciarSessaoCliente(c, id);

  return c.json({ clienteId: id, vinculado }, vinculado ? 200 : 201);
});

clientesPublicoRoutes.post("/login", async (c) => {
  const validacao = await validarCorpo(c, loginPublicoSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const cliente = await autenticarClientePublico(c.get("db"), validacao.dados);
    await iniciarSessaoCliente(c, cliente.id);
    return c.json({ cliente });
  } catch (erro) {
    if (erro instanceof CredenciaisInvalidasError) {
      return c.json({ erro: erro.message }, 401);
    }
    throw erro;
  }
});

clientesPublicoRoutes.post("/logout", exigirLoginCliente, async (c) => {
  const token = await getSignedCookie(c, c.env.SESSAO_SECRETO, NOME_COOKIE_SESSAO_CLIENTE);
  if (token) {
    await destruirSessaoCliente(c.get("db"), token);
  }
  deleteCookie(c, NOME_COOKIE_SESSAO_CLIENTE, { path: "/" });
  return c.json({ ok: true });
});
