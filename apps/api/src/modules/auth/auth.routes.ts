import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { NOME_COOKIE_SESSAO, criarSessao, destruirSessao } from "../../shared/sessao/sessao.util";
import { loginSchema, registrarSocioSchema } from "./auth.schema";
import { BootstrapEncerradoError, CredenciaisInvalidasError, autenticar, registrarSocio } from "./auth.service";

export const authRoutes = new Hono<AppContexto>();

authRoutes.post("/registrar-socio", async (c) => {
  const validacao = await validarCorpo(c, registrarSocioSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const { usuario, barbeiro } = await registrarSocio(c.get("db"), validacao.dados);
    return c.json({ usuario, barbeiro }, 201);
  } catch (erro) {
    if (erro instanceof BootstrapEncerradoError) {
      return c.json({ erro: erro.message }, 403);
    }
    // Violação de unicidade de telefone (ex.: bootstrap concorrente) também deve
    // resultar em 403 de bootstrap encerrado, não em 500 genérico.
    if (erro instanceof Error && /unique/i.test(erro.message)) {
      return c.json({ erro: "Cadastro de sócio já foi concluído." }, 403);
    }
    throw erro;
  }
});

authRoutes.post("/login", async (c) => {
  const validacao = await validarCorpo(c, loginSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    const usuario = await autenticar(c.get("db"), validacao.dados);
    const { token, expiraEm } = await criarSessao(c.get("db"), usuario.id);

    setCookie(c, NOME_COOKIE_SESSAO, token, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      expires: expiraEm,
    });

    return c.json({ usuario });
  } catch (erro) {
    if (erro instanceof CredenciaisInvalidasError) {
      return c.json({ erro: erro.message }, 401);
    }
    throw erro;
  }
});

authRoutes.post("/logout", exigirLogin, async (c) => {
  const token = getCookie(c, NOME_COOKIE_SESSAO);
  if (token) {
    await destruirSessao(c.get("db"), token);
  }
  deleteCookie(c, NOME_COOKIE_SESSAO, { path: "/" });
  return c.json({ ok: true });
});
