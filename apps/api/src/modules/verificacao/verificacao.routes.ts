import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { obterIp } from "../../shared/http/ip.util";
import { exigirLoginCliente } from "../../shared/middleware/exigir-login-cliente";
import { criarEnviadorWhatsapp } from "../../shared/whatsapp/enviador-whatsapp";
import { confirmarVerificacaoSchema } from "./verificacao.schema";
import { CodigoInvalidoError, RateLimitError, confirmarCodigoVerificacao, enviarCodigoVerificacao } from "./verificacao.service";

export const verificacaoRoutes = new Hono<AppContexto>();

// Ambas as rotas exigem o cliente já logado (ver verificacao.service.ts — o telefone-alvo
// é sempre o da sessão, nunca vem do corpo da requisição).
verificacaoRoutes.use("*", exigirLoginCliente);

verificacaoRoutes.post("/enviar", async (c) => {
  const clienteId = c.get("clienteId");
  if (!clienteId) return c.json({ erro: "Não autenticado." }, 401);

  const enviador = criarEnviadorWhatsapp(c.env);
  const ip = obterIp(c);

  try {
    await enviarCodigoVerificacao(c.get("db"), enviador, clienteId, ip);
    return c.json({ ok: true });
  } catch (erro) {
    if (erro instanceof RateLimitError) {
      c.header("Retry-After", String(erro.retryAfterSegundos));
      return c.json({ erro: erro.message, retryAfterSegundos: erro.retryAfterSegundos }, 429);
    }
    throw erro;
  }
});

verificacaoRoutes.post("/confirmar", async (c) => {
  const clienteId = c.get("clienteId");
  if (!clienteId) return c.json({ erro: "Não autenticado." }, 401);

  const validacao = await validarCorpo(c, confirmarVerificacaoSchema);
  if (validacao.dados === null) return validacao.resposta;

  try {
    await confirmarCodigoVerificacao(c.get("db"), clienteId, validacao.dados.codigo);
    return c.json({ ok: true });
  } catch (erro) {
    if (erro instanceof CodigoInvalidoError) {
      return c.json({ erro: erro.message }, 400);
    }
    throw erro;
  }
});
