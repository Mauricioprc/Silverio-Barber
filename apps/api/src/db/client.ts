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

/**
 * Tipo da transação recebida pelo callback de `db.transaction(async (tx) => ...)` —
 * `tx` tem a mesma API de consulta (`select`/`insert`/`update`/`delete`) de `Db`, mas não
 * é estruturalmente o mesmo tipo (não carrega `$client`, por exemplo), então funções que
 * precisam aceitar tanto `db` quanto `tx` (para serem chamadas de dentro de uma
 * transação — ver `shared/ocupacao/ocupacao.util.ts`) devem tipar o parâmetro como
 * `DbOuTx`, não `Db`.
 */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOuTx = Db | Tx;
