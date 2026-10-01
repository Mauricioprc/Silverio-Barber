CREATE TABLE IF NOT EXISTS "barbeiro_servicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbeiro_id" integer NOT NULL,
	"servico_id" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "barbeiro_servicos_par_unico" UNIQUE("barbeiro_id","servico_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barbeiro_servicos" ADD CONSTRAINT "barbeiro_servicos_barbeiro_id_barbeiros_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "barbeiro_servicos" ADD CONSTRAINT "barbeiro_servicos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Backfill retrocompatível (Fase D do redesenho de Serviços): todo barbeiro já fica
-- vinculado a todo serviço existente, ativo — nada muda pra quem já usa o sistema antes
-- desta migração. `ON CONFLICT DO NOTHING` pela constraint acima torna isto seguro de
-- rodar mais de uma vez.
INSERT INTO "barbeiro_servicos" ("barbeiro_id", "servico_id", "ativo")
SELECT "barbeiros"."id", "servicos"."id", true
FROM "barbeiros"
CROSS JOIN "servicos"
ON CONFLICT ("barbeiro_id", "servico_id") DO NOTHING;
