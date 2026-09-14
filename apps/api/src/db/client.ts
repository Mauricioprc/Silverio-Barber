import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Cria a conexão Neon+Drizzle. Usa `Pool` (WebSocket) do driver serverless da Neon, não
 * o driver `neon-http` — o `neon-http` não suporta transações reais (`db.transaction`),
 * e a substituição de disponibilidade semanal (`barbeiros.service.ts`) precisa de
 * apagar+recriar atomicamente. `Pool` continua sem exigir conexão TCP persistente
 * (funciona via WebSocket) e roda normalmente no runtime de Workers. Uma instância é
 * criada por requisição (ver `shared/tipos.ts` e `index.ts`) e fechada ao final dela.
 */
export function criarDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof criarDb>;
