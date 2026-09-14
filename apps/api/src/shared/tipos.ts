import type { Db } from "../db/client";

/** Bindings do Worker: variáveis de ambiente e secrets configurados no Cloudflare. */
export type Env = {
  DATABASE_URL: string;
  SESSAO_SECRETO: string;
  AMBIENTE: string;
};

/** Estado por requisição, disponível em `c.get(...)` dentro das rotas Hono. */
export type Variaveis = {
  db: Db;
  usuarioId: number | null;
};

export type AppContexto = {
  Bindings: Env;
  Variables: Variaveis;
};
