CREATE TABLE IF NOT EXISTS "tentativas_acesso" (
	"id" serial PRIMARY KEY NOT NULL,
	"contexto" text NOT NULL,
	"identificador" text NOT NULL,
	"ip" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Enum via texto + CHECK (mesmo padrão já usado no restante do projeto).
ALTER TABLE "tentativas_acesso" ADD CONSTRAINT "tentativas_acesso_contexto_valido"
  CHECK ("contexto" IN ('login_socio', 'login_cliente', 'cadastro_publico'));
--> statement-breakpoint

-- Índices que sustentam as duas consultas de `rate-limite.util.ts` (contagem por
-- identificador e por IP dentro da janela, sempre filtrando por contexto primeiro).
CREATE INDEX IF NOT EXISTS "tentativas_acesso_contexto_identificador_criado_em_idx"
  ON "tentativas_acesso" ("contexto", "identificador", "criado_em");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tentativas_acesso_contexto_ip_criado_em_idx"
  ON "tentativas_acesso" ("contexto", "ip", "criado_em");
