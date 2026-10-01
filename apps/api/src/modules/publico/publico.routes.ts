import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { validarCorpo } from "../../shared/http/validar";
import { exigirLoginCliente } from "../../shared/middleware/exigir-login-cliente";
import { criarEnviadorWhatsapp } from "../../shared/whatsapp/enviador-whatsapp";
import { ConflitoHorarioError } from "../../shared/ocupacao/ocupacao.util";
import { BarbeiroInvalidoError, ServicoInvalidoError, ServicoNaoAtendidoPeloBarbeiroError } from "../agendamentos/agendamentos.service";
import { agendamentoPublicoSchema, disponibilidadeQuerySchema } from "./publico.schema";
import { TelefoneNaoVerificadoError, calcularDisponibilidade, criarAgendamentoPublico, listarBarbeirosPublicos, listarServicosPublicos } from "./publico.service";

const NOME_TEMPLATE_CONFIRMACAO_PADRAO = "confirmacao_agendamento";

export const publicoRoutes = new Hono<AppContexto>();

// GET /api/publico/servicos, /barbeiros e /disponibilidade não exigem login — são a
// vitrine da página pública (Serviço → Barbeiro → Data/Horário, ver escopo da Fase 4).
publicoRoutes.get("/servicos", async (c) => {
  const lista = await listarServicosPublicos(c.get("db"));
  return c.json({ servicos: lista });
});

publicoRoutes.get("/barbeiros", async (c) => {
  // Fase D do redesenho de Serviços — `servico_id` (opcional, mas o front novo sempre
  // manda: fluxo é serviço → barbeiro) restringe a quem atende aquele serviço.
  const servicoIdBruto = c.req.query("servico_id");
  const servicoId = servicoIdBruto !== undefined ? Number(servicoIdBruto) : undefined;
  if (servicoId !== undefined && !Number.isInteger(servicoId)) {
    return c.json({ erro: "servico_id inválido." }, 400);
  }

  const lista = await listarBarbeirosPublicos(c.get("db"), servicoId);
  return c.json({ barbeiros: lista });
});

publicoRoutes.get("/disponibilidade", async (c) => {
  const query = disponibilidadeQuerySchema.safeParse({
    barbeiro_id: c.req.query("barbeiro_id"),
    data: c.req.query("data"),
  });
  if (!query.success) {
    return c.json({ erro: "Parâmetros inválidos.", detalhes: query.error.flatten() }, 400);
  }

  const disponibilidade = await calcularDisponibilidade(c.get("db"), query.data.barbeiro_id, query.data.data);
  return c.json({ disponibilidade });
});

// A partir daqui, exige cliente logado (último passo do fluxo: Login/Cadastro →
// Confirmação).
publicoRoutes.post("/agendamentos", exigirLoginCliente, async (c) => {
  const clienteId = c.get("clienteId");
  if (!clienteId) return c.json({ erro: "Não autenticado." }, 401);

  const validacao = await validarCorpo(c, agendamentoPublicoSchema);
  if (validacao.dados === null) return validacao.resposta;

  const enviador = criarEnviadorWhatsapp(c.env);
  const nomeTemplate = c.env.WHATSAPP_TEMPLATE_CONFIRMACAO ?? NOME_TEMPLATE_CONFIRMACAO_PADRAO;

  try {
    const agendamento = await criarAgendamentoPublico(c.get("db"), enviador, nomeTemplate, clienteId, validacao.dados);
    return c.json({ agendamento }, 201);
  } catch (erro) {
    if (erro instanceof TelefoneNaoVerificadoError) {
      return c.json({ erro: erro.message, precisaVerificar: true }, 403);
    }
    if (
      erro instanceof BarbeiroInvalidoError ||
      erro instanceof ServicoInvalidoError ||
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
