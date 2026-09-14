import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiros, bloqueiosAgenda } from "../../db/schema";
import { inserirOcupacao, removerOcupacaoDeBloqueio } from "../../shared/ocupacao/ocupacao.util";
import type { CriarBloqueioInput } from "./bloqueios.schema";

export class BarbeiroInvalidoError extends Error {
  constructor() {
    super("Barbeiro não encontrado ou inativo.");
    this.name = "BarbeiroInvalidoError";
  }
}

export class BloqueioNaoEncontradoError extends Error {
  constructor() {
    super("Bloqueio não encontrado.");
    this.name = "BloqueioNaoEncontradoError";
  }
}

function comSegundos(horario: string): string {
  return horario.length === 16 ? `${horario}:00` : horario;
}

export async function listarBloqueios(db: Db, barbeiroId?: number) {
  if (barbeiroId !== undefined) {
    return db.select().from(bloqueiosAgenda).where(eq(bloqueiosAgenda.barbeiroId, barbeiroId));
  }
  return db.select().from(bloqueiosAgenda);
}

/**
 * Cria o bloqueio e sua linha-espelho em `ocupacoes_barbeiro` na mesma transação — a
 * mesma exclusion constraint que impede dois agendamentos sobrepostos também impede
 * criar um bloqueio sobre um agendamento existente (ou sobre outro bloqueio), sem
 * precisar de nenhuma verificação separada aqui.
 */
export async function criarBloqueio(db: Db, dados: CriarBloqueioInput) {
  const [barbeiro] = await db
    .select({ id: barbeiros.id, ativo: barbeiros.ativo })
    .from(barbeiros)
    .where(eq(barbeiros.id, dados.barbeiroId))
    .limit(1);
  if (!barbeiro || !barbeiro.ativo) {
    throw new BarbeiroInvalidoError();
  }

  const inicio = comSegundos(dados.inicio);
  const fim = comSegundos(dados.fim);

  return db.transaction(async (tx) => {
    const [bloqueio] = await tx
      .insert(bloqueiosAgenda)
      .values({ barbeiroId: dados.barbeiroId, inicio, fim, motivo: dados.motivo })
      .returning();

    if (!bloqueio) {
      throw new Error("Falha inesperada ao criar bloqueio.");
    }

    await inserirOcupacao(tx, { tipo: "bloqueio", bloqueioId: bloqueio.id, barbeiroId: dados.barbeiroId, inicio, fim });

    return bloqueio;
  });
}

/**
 * Remove o bloqueio de verdade (não é soft delete — diferente de `agendamentos`, um
 * bloqueio é só uma marcação de indisponibilidade, não um dado financeiro/histórico; ver
 * README). Remove também a linha de ocupação correspondente, na mesma transação.
 */
export async function removerBloqueio(db: Db, id: number) {
  return db.transaction(async (tx) => {
    // A linha de ocupação referencia o bloqueio via FK — precisa ser removida antes,
    // senão a exclusão do bloqueio violaria a constraint de chave estrangeira.
    await removerOcupacaoDeBloqueio(tx, id);

    const [bloqueio] = await tx.delete(bloqueiosAgenda).where(eq(bloqueiosAgenda.id, id)).returning();
    if (!bloqueio) {
      throw new BloqueioNaoEncontradoError();
    }
    return bloqueio;
  });
}
