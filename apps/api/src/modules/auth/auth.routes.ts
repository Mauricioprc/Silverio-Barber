import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { NOME_COOKIE_SESSAO, criarSessao, destruirSessao } from "../../shared/sessao/sessao.util";
import { criarSolicitacaoSocioSchema, loginSchema, registrarSocioSchema } from "./auth.schema";
import {
  AprovacaoDuplicadaError,
  BootstrapEncerradoError,
  CredenciaisInvalidasError,
  SolicitacaoNaoEncontradaError,
  SolicitacaoNaoPendenteError,
  aprovarSolicitacaoSocio,
  autenticar,
  criarSolicitacaoSocio,
  listarSolicitacoesSocio,
  registrarSocio,
  rejeitarSolicitacaoSocio,
} from "./auth.service";

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

// --- Expansão do quadro de sócios (a partir do 3º) ---------------------------------
// `registrar-socio` só funciona para os 2 primeiros sócios (bootstrap). A partir daí,
// adicionar um novo sócio exige que todos os sócios ativos aprovem, cada um autenticado
// na própria sessão — ver 01a-fase1-correcoes.md.

authRoutes.post("/solicitacoes-socio", exigirLogin, async (c) => {
  const validacao = await validarCorpo(c, criarSolicitacaoSocioSchema);
  if (validacao.dados === null) return validacao.resposta;

  const solicitanteId = c.get("usuarioId");
  if (!solicitanteId) return c.json({ erro: "Não autenticado." }, 401);

  const resultado = await criarSolicitacaoSocio(c.get("db"), solicitanteId, validacao.dados);
  return c.json(resultado, 201);
});

authRoutes.get("/solicitacoes-socio", exigirLogin, async (c) => {
  const solicitacoes = await listarSolicitacoesSocio(c.get("db"));
  return c.json({ solicitacoes });
});

authRoutes.post("/solicitacoes-socio/:id/aprovar", exigirLogin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  const usuarioId = c.get("usuarioId");
  if (!usuarioId) return c.json({ erro: "Não autenticado." }, 401);

  try {
    const resultado = await aprovarSolicitacaoSocio(c.get("db"), id, usuarioId);
    return c.json(resultado);
  } catch (erro) {
    if (erro instanceof SolicitacaoNaoEncontradaError) return c.json({ erro: erro.message }, 404);
    if (erro instanceof SolicitacaoNaoPendenteError) return c.json({ erro: erro.message }, 409);
    if (erro instanceof AprovacaoDuplicadaError) return c.json({ erro: erro.message }, 409);
    throw erro;
  }
});

authRoutes.post("/solicitacoes-socio/:id/rejeitar", exigirLogin, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ erro: "Id inválido." }, 400);

  try {
    const solicitacao = await rejeitarSolicitacaoSocio(c.get("db"), id);
    return c.json({ solicitacao });
  } catch (erro) {
    if (erro instanceof SolicitacaoNaoEncontradaError) return c.json({ erro: erro.message }, 404);
    if (erro instanceof SolicitacaoNaoPendenteError) return c.json({ erro: erro.message }, 409);
    throw erro;
  }
});
