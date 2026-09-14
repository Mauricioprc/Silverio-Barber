import { config } from "dotenv";
// `.dev.vars` é o arquivo que o Wrangler usa em desenvolvimento local (ver README.md) —
// carregamos ele explicitamente aqui porque o comportamento padrão de `dotenv` é ler só
// `.env`, e este script roda fora do runtime do Worker.
config({ path: ".dev.vars" });
config(); // fallback: também aceita `.env`, se existir, sem sobrescrever o que já foi lido
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

/**
 * Script de linha de comando (`npm run db:migrate`) para aplicar as migrações geradas
 * pelo drizzle-kit contra o banco apontado por DATABASE_URL (`.dev.vars`/`.env` local, ou
 * a variável de ambiente real em produção/CI). Não roda dentro do Worker — é uma
 * ferramenta de operação, executada manualmente ou em pipeline de deploy.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definida. Ver README.md.");
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("Aplicando migrações em", databaseUrl.replace(/:[^:@]*@/, ":***@"));
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrações aplicadas com sucesso.");
}

main().catch((erro) => {
  console.error("Falha ao aplicar migrações:", erro);
  process.exit(1);
});
