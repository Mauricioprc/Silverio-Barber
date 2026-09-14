import type { Db } from "../db/client";

/** Bindings do Worker: variáveis de ambiente e secrets configurados no Cloudflare. */
export type Env = {
  DATABASE_URL: string;
  SESSAO_SECRETO: string;
  AMBIENTE: string;
  /**
   * `"mock"` (padrão em desenvolvimento) ou `"real"` — seleciona a implementação de
   * `EnviadorWhatsapp` (ver `shared/whatsapp/enviador-whatsapp.ts`). As três variáveis
   * abaixo só são exigidas quando `WHATSAPP_MODO="real"`.
   */
  WHATSAPP_MODO?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_TEMPLATE_CONFIRMACAO?: string;
  WHATSAPP_TEMPLATE_LEMBRETE?: string;
};

/** Estado por requisição, disponível em `c.get(...)` dentro das rotas Hono. */
export type Variaveis = {
  db: Db;
  usuarioId: number | null;
  clienteId: number | null;
};

export type AppContexto = {
  Bindings: Env;
  Variables: Variaveis;
};
