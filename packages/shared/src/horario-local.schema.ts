import { z } from "zod";

/**
 * Formato aceito para horários locais: `"YYYY-MM-DD HH:MM"` ou `"YYYY-MM-DDTHH:MM"`, sem
 * informação de fuso — ver comentário em `apps/api/src/db/schema.ts` sobre por que as
 * colunas de horário são `timestamp` sem timezone. Segundos são opcionais.
 */
export const horarioLocalSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/,
    'Horário inválido — use o formato "YYYY-MM-DD HH:MM" (sem fuso).'
  );
