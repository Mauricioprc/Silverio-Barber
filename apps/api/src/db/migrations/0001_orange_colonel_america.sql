-- Pré-requisito da exclusion constraint abaixo (ocupacoes_barbeiro_sem_sobreposicao):
-- sem esta extensão, um índice GiST não pode combinar uma coluna de igualdade
-- (barbeiro_id) com uma de intervalo (tsrange) — ver regra 8 do documento de
-- convenções.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agendamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbeiro_id" integer NOT NULL,
	"servico_id" integer NOT NULL,
	"nome_cliente" text NOT NULL,
	"telefone_cliente" text NOT NULL,
	"inicio" timestamp NOT NULL,
	"fim" timestamp NOT NULL,
	"status" text DEFAULT 'confirmado' NOT NULL,
	"valor_cobrado_centavos" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bloqueios_agenda" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbeiro_id" integer NOT NULL,
	"inicio" timestamp NOT NULL,
	"fim" timestamp NOT NULL,
	"motivo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ocupacoes_barbeiro" (
	"id" serial PRIMARY KEY NOT NULL,
	"barbeiro_id" integer NOT NULL,
	"inicio" timestamp NOT NULL,
	"fim" timestamp NOT NULL,
	"tipo" text NOT NULL,
	"agendamento_id" integer,
	"bloqueio_id" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_barbeiro_id_barbeiros_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bloqueios_agenda" ADD CONSTRAINT "bloqueios_agenda_barbeiro_id_barbeiros_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_barbeiro_id_barbeiros_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_bloqueio_id_bloqueios_agenda_id_fk" FOREIGN KEY ("bloqueio_id") REFERENCES "public"."bloqueios_agenda"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- CHECKs de horário válido (regra 8: complemento obrigatório da exclusion constraint —
-- ela sozinha não impede fim <= inicio, só sobreposição entre linhas).
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_horario_valido" CHECK ("fim" > "inicio");
--> statement-breakpoint
ALTER TABLE "bloqueios_agenda" ADD CONSTRAINT "bloqueios_agenda_horario_valido" CHECK ("fim" > "inicio");
--> statement-breakpoint
ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_horario_valido" CHECK ("fim" > "inicio");
--> statement-breakpoint

-- Enums via texto + CHECK (mesmo padrão já usado no restante do projeto).
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_status_valido"
  CHECK ("status" IN ('confirmado', 'cancelado', 'concluido'));
--> statement-breakpoint
ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_tipo_valido"
  CHECK ("tipo" IN ('agendamento', 'bloqueio'));
--> statement-breakpoint

-- Cada linha de ocupacoes_barbeiro representa OU um agendamento OU um bloqueio, nunca
-- os dois — e o id preenchido tem que corresponder ao tipo.
ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_referencia_consistente"
  CHECK (
    ("tipo" = 'agendamento' AND "agendamento_id" IS NOT NULL AND "bloqueio_id" IS NULL) OR
    ("tipo" = 'bloqueio' AND "bloqueio_id" IS NOT NULL AND "agendamento_id" IS NULL)
  );
--> statement-breakpoint

-- Defesa em profundidade contra duplicar a linha-espelho do mesmo agendamento/bloqueio
-- (cada um só pode ter, no máximo, uma linha de ocupação ativa).
CREATE UNIQUE INDEX IF NOT EXISTS "ocupacoes_barbeiro_agendamento_id_key"
  ON "ocupacoes_barbeiro" ("agendamento_id") WHERE "agendamento_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ocupacoes_barbeiro_bloqueio_id_key"
  ON "ocupacoes_barbeiro" ("bloqueio_id") WHERE "bloqueio_id" IS NOT NULL;
--> statement-breakpoint

-- A trava de conflito de horário de verdade (regra 8): impede duas linhas de ocupação do
-- mesmo barbeiro com intervalos que se sobrepõem — cobre agendamento×agendamento,
-- agendamento×bloqueio e bloqueio×bloqueio com uma única constraint, porque as 3
-- situações têm, cada uma, uma linha nesta tabela. Não tem `WHERE status <> 'cancelado'`
-- (diferente do SQL de referência da regra 8) porque cancelamento aqui não é soft
-- delete: a aplicação apaga a linha de ocupação correspondente ao cancelar um
-- agendamento ou remover um bloqueio (o histórico continua intacto em `agendamentos`,
-- que nunca é apagado — regra 5). Ver README para o detalhe da decisão de modelagem.
ALTER TABLE "ocupacoes_barbeiro" ADD CONSTRAINT "ocupacoes_barbeiro_sem_sobreposicao"
  EXCLUDE USING gist (
    "barbeiro_id" WITH =,
    tsrange("inicio", "fim") WITH &&
  );
