import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { servicos } from "../../db/schema";
import type { CriarServicoInput, EditarServicoInput } from "./servicos.schema";

export class ServicoNaoEncontradoError extends Error {
  constructor() {
    super("Serviço não encontrado.");
    this.name = "ServicoNaoEncontradoError";
  }
}

export async function listarServicos(db: Db, apenasAtivos: boolean) {
  if (apenasAtivos) {
    return db.select().from(servicos).where(eq(servicos.ativo, true));
  }
  return db.select().from(servicos);
}

export async function criarServico(db: Db, dados: CriarServicoInput) {
  const [servico] = await db.insert(servicos).values(dados).returning();
  return servico;
}

export async function editarServico(db: Db, id: number, dados: EditarServicoInput) {
  const [servico] = await db.update(servicos).set(dados).where(eq(servicos.id, id)).returning();
  if (!servico) throw new ServicoNaoEncontradoError();
  return servico;
}

/** Soft delete — regra 5 do documento de convenções: serviço nunca é apagado de verdade. */
export async function desativarServico(db: Db, id: number) {
  const [servico] = await db
    .update(servicos)
    .set({ ativo: false })
    .where(eq(servicos.id, id))
    .returning();
  if (!servico) throw new ServicoNaoEncontradoError();
  return servico;
}
