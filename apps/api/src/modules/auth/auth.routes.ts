import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { obterIp } from "../../shared/http/ip.util";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { LIMITE_LOGIN, LimiteTentativasError, verificarLimiteTentativas } from "../../shared/rate-limit/rate-limite.util";
import { NOME_COOKIE_SESSAO, criarSessao, destruirSessao } from "../../shared/sessao/sessao.util";
import { loginSchema, registrarSocioSchema } from "./auth.schema";
import {
  BootstrapEncerradoError,
  CredenciaisInvalidasError,
  autenticar,
  obterUsuarioPorId,
  registrarSocio,
} from "./auth.service";

export const authRoutes = new Hono<AppContexto>();

authRoutes.get("/eu", exigirLogin, async (c) => {
  const usuario = await obterUsuarioPorId(c.get("db"), c.get("usuarioId")!);
  if (!usuario) {
    return c.json({ erro: "Sessão inválida ou expirada." }, 401);
  }
  return c.json({ usuario });
});

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
    // Correção pós-auditoria: limite de tentativas por telefone+IP antes de checar a
    // senha — sem isso, o login de sócio (acesso administrativo total) não tinha
    // nenhuma defesa contra força bruta. Conta a tentativa mesmo que a senha esteja
    // certa (ver `rate-limite.util.ts`).
    await verificarLimiteTentativas(c.get("db"), "login_socio", validacao.dados.telefone, obterIp(c), LIMITE_LOGIN);

    const usuario = await autenticar(c.get("db"), validacao.dados);
    const { token, expiraEm } = await criarSessao(c.get("db"), usuario.id);

    // Cookie assinado com SESSAO_SECRETO (regra 2 do documento de convenções) — além do
    // token opaco em si já ser validado contra a tabela `sessoes` no banco, a assinatura
    // impede que o valor do cookie seja adulterado no cliente sem invalidar a assinatura.
    await setSignedCookie(c, NOME_COOKIE_SESSAO, token, c.env.SESSAO_SECRETO, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      expires: expiraEm,
    });

    return c.json({ usuario });
  } catch (erro) {
    if (erro instanceof LimiteTentativasError) {
      c.header("Retry-After", String(erro.retryAfterSegundos));
      return c.json({ erro: erro.message }, 429);
    }
    if (erro instanceof CredenciaisInvalidasError) {
      return c.json({ erro: erro.message }, 401);
    }
    throw erro;
  }
});

authRoutes.post("/logout", exigirLogin, async (c) => {
  const token = await getSignedCookie(c, c.env.SESSAO_SECRETO, NOME_COOKIE_SESSAO);
  if (token) {
    await destruirSessao(c.get("db"), token);
  }
  deleteCookie(c, NOME_COOKIE_SESSAO, { path: "/" });
  return c.json({ ok: true });
});
