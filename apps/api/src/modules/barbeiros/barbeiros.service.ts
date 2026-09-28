import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiros, disponibilidadeBarbeiro, usuarios } from "../../db/schema";
import type { SubstituirDisponibilidadeInput } from "./barbeiros.schema";

export class BarbeiroNaoEncontradoError extends Error {
  constructor() {
    super("Barbeiro não encontrado.");
    this.name = "BarbeiroNaoEncontradoError";
  }
}

/**
 * `filtroBarbeiroId` restringe o resultado a um único registro — usado pra não-admin, que
 * só pode ver o próprio (ver `barbeiros.routes.ts`, `escopo.barbeiroId`). Admin chama sem
 * esse filtro e recebe a lista inteira, como sempre.
 */
export async function listarBarbeiros(db: Db, filtroBarbeiroId?: number) {
  return db
    .select({
      id: barbeiros.id,
      usuarioId: barbeiros.usuarioId,
      ativo: barbeiros.ativo,
      nome: usuarios.nome,
      usuario: usuarios.usuario,
      telefone: usuarios.telefone,
    })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(filtroBarbeiroId !== undefined ? eq(barbeiros.id, filtroBarbeiroId) : undefined);
}

async function existeBarbeiro(db: Db, barbeiroId: number): Promise<boolean> {
  const [encontrado] = await db.select({ id: barbeiros.id }).from(barbeiros).where(eq(barbeiros.id, barbeiroId)).limit(1);
  return Boolean(encontrado);
}

/**
 * `nome` atualiza `usuarios.nome` (via `usuarioId` do barbeiro) — feito fora de transação
 * porque as duas escritas são independentes e nenhuma delas precisa desfazer a outra se a
 * segunda falhar.
 */
export async function atualizarBarbeiro(db: Db, barbeiroId: number, dados: { ativo?: boolean; nome?: string }) {
  const [existente] = await db.select({ usuarioId: barbeiros.usuarioId }).from(barbeiros).where(eq(barbeiros.id, barbeiroId)).limit(1);
  if (!existente) {
    throw new BarbeiroNaoEncontradoError();
  }

  if (dados.ativo !== undefined) {
    await db.update(barbeiros).set({ ativo: dados.ativo }).where(eq(barbeiros.id, barbeiroId));
  }

  if (dados.nome !== undefined) {
    await db.update(usuarios).set({ nome: dados.nome }).where(eq(usuarios.id, existente.usuarioId));
  }

  const [barbeiro] = await db
    .select({
      id: barbeiros.id,
      usuarioId: barbeiros.usuarioId,
      ativo: barbeiros.ativo,
      nome: usuarios.nome,
      usuario: usuarios.usuario,
      telefone: usuarios.telefone,
    })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(eq(barbeiros.id, barbeiroId))
    .limit(1);

  if (!barbeiro) throw new BarbeiroNaoEncontradoError();
  return barbeiro;
}

export async function listarDisponibilidade(db: Db, barbeiroId: number) {
  if (!(await existeBarbeiro(db, barbeiroId))) {
    throw new BarbeiroNaoEncontradoError();
  }

  return db
    .select({
      id: disponibilidadeBarbeiro.id,
      diaSemana: disponibilidadeBarbeiro.diaSemana,
      horaInicio: disponibilidadeBarbeiro.horaInicio,
      horaFim: disponibilidadeBarbeiro.horaFim,
    })
    .from(disponibilidadeBarbeiro)
    .where(eq(disponibilidadeBarbeiro.barbeiroId, barbeiroId));
}

/**
 * Substitui a disponibilidade semanal inteira do barbeiro (apaga tudo e recria a partir
 * da lista recebida). Executado em transação: uma falha na inserção não deve deixar o
 * barbeiro sem nenhuma disponibilidade registrada.
 */
export async function substituirDisponibilidade(db: Db, barbeiroId: number, dados: SubstituirDisponibilidadeInput) {
  if (!(await existeBarbeiro(db, barbeiroId))) {
    throw new BarbeiroNaoEncontradoError();
  }

  return db.transaction(async (tx) => {
    await tx.delete(disponibilidadeBarbeiro).where(eq(disponibilidadeBarbeiro.barbeiroId, barbeiroId));

    if (dados.disponibilidade.length === 0) {
      return [];
    }

    return tx
      .insert(disponibilidadeBarbeiro)
      .values(
        dados.disponibilidade.map((faixa) => ({
          barbeiroId,
          diaSemana: faixa.diaSemana,
          horaInicio: faixa.horaInicio,
          horaFim: faixa.horaFim,
        }))
      )
      .returning();
  });
}
