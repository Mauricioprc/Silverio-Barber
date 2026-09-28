ALTER TABLE "usuarios" ADD COLUMN "usuario" text;--> statement-breakpoint
UPDATE "usuarios" SET "usuario" = "telefone" WHERE "usuario" IS NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ALTER COLUMN "usuario" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_usuario_unique" UNIQUE("usuario");
