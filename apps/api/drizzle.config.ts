import { config } from "dotenv";
// Mesmo motivo de `src/db/migrar.ts`: `.dev.vars` é o arquivo usado em desenvolvimento
// local (ver README.md), e o `dotenv` só lê `.env` por padrão.
config({ path: ".dev.vars" });
config();
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definida. Crie um arquivo .dev.vars (ou .env) com a string de " +
      "conexão do Neon antes de rodar drizzle-kit. Ver README.md."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
