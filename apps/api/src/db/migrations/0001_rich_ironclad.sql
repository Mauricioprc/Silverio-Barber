CREATE TABLE IF NOT EXISTS "aprovacoes_socio" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitacao_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"aprovado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aprovacoes_socio_solicitacao_id_usuario_id_unique" UNIQUE("solicitacao_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "solicitacoes_socio" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"senha_hash" text NOT NULL,
	"solicitado_por" integer NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvida_em" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aprovacoes_socio" ADD CONSTRAINT "aprovacoes_socio_solicitacao_id_solicitacoes_socio_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacoes_socio"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aprovacoes_socio" ADD CONSTRAINT "aprovacoes_socio_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "solicitacoes_socio" ADD CONSTRAINT "solicitacoes_socio_solicitado_por_usuarios_id_fk" FOREIGN KEY ("solicitado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
