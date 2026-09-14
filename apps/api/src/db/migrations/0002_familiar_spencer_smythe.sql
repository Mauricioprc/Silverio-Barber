CREATE TABLE IF NOT EXISTS "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"senha_hash" text NOT NULL,
	"telefone_verificado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_telefone_unique" UNIQUE("telefone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lancamentos_financeiros" (
	"id" serial PRIMARY KEY NOT NULL,
	"agendamento_id" integer NOT NULL,
	"barbeiro_id" integer NOT NULL,
	"valor_centavos" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lancamentos_financeiros_agendamento_id_unique" UNIQUE("agendamento_id")
);
--> statement-breakpoint
ALTER TABLE "agendamentos" ADD COLUMN "cliente_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_barbeiro_id_barbeiros_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
