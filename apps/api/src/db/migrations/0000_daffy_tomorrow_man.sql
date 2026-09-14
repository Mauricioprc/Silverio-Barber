CREATE TABLE IF NOT EXISTS "barbeiros" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "barbeiros_usuario_id_unique" UNIQUE("usuario_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disponibilidade_barbeiro" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbeiro_id" integer NOT NULL,
	"dia_semana" smallint NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fim" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "servicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"valor_centavos" integer NOT NULL,
	"duracao_minutos" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_telefone_unique" UNIQUE("telefone")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barbeiros" ADD CONSTRAINT "barbeiros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disponibilidade_barbeiro" ADD CONSTRAINT "disponibilidade_barbeiro_barbeiro_id_barbeiros_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
