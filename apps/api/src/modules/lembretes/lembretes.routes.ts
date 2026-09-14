import { Hono } from "hono";
import type { AppContexto } from "../../shared/tipos";
import { exigirLogin } from "../../shared/middleware/exigir-login";
import { criarEnviadorWhatsapp } from "../../shared/whatsapp/enviador-whatsapp";
import { enviarLembretes } from "./lembretes.service";

const NOME_TEMPLATE_LEMBRETE_PADRAO = "lembrete_agendamento";

/**
 * Endpoint interno (protegido por login de sócio, não público) que dispara os lembretes
 * "de agora" — ver escopo da Fase 4: implementar o mecanismo de agendamento do job em si
 * (cron do Workers ou equivalente) fica para depois; por enquanto, um sócio pode
 * acionar manualmente, e um cron real (Fase 5+) chamaria essa mesma rota ou a função
 * `enviarLembretes` diretamente.
 */
export const lembretesRoutes = new Hono<AppContexto>();

lembretesRoutes.use("*", exigirLogin);

lembretesRoutes.post("/enviar", async (c) => {
  const enviador = criarEnviadorWhatsapp(c.env);
  const nomeTemplate = c.env.WHATSAPP_TEMPLATE_LEMBRETE ?? NOME_TEMPLATE_LEMBRETE_PADRAO;
  const resultado = await enviarLembretes(c.get("db"), enviador, nomeTemplate, new Date());
  return c.json(resultado);
});
