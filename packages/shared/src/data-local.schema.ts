import { z } from "zod";

/** Formato de data aceito nas consultas de disponibilidade: `"YYYY-MM-DD"`, sem fuso. */
export const dataLocalSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use o formato "YYYY-MM-DD".');
