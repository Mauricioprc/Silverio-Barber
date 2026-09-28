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

/**
 * Escopo de autorização do usuário logado, resolvido uma vez por requisição em
 * `exigirLogin` e reaproveitado por todas as rotas (ver `shared/auth/exigir-dono-ou-admin.ts`).
 * `barbeiroId` é `null` pra conta admin (não tem linha em `barbeiros`) — nesse caso
 * `admin` já é `true` e nenhuma rota deveria olhar pra `barbeiroId`.
 */
export type EscopoAutorizacao = { admin: boolean; barbeiroId: number | null };

/** Estado por requisição, disponível em `c.get(...)` dentro das rotas Hono. */
export type Variaveis = {
  db: Db;
  usuarioId: number | null;
  clienteId: number | null;
  escopo: EscopoAutorizacao | null;
};

export type AppContexto = {
  Bindings: Env;
  Variables: Variaveis;
};
