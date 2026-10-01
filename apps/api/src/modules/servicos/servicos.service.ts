import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiroServicos, barbeiros, servicos, usuarios } from "../../db/schema";
import type { EscopoAutorizacao } from "../../shared/tipos";
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

/**
 * Novo serviço nasce vinculado — admin (vê/gerencia tudo) vincula a todos os barbeiros
 * existentes, de uma vez (Fase D, item 5 da proposta aprovada, mesma regra da migração
 * de backfill). Sócio comum (barbeiro) só vincula a si mesmo: ele não tem como saber se
 * "ativar" o colega nesse serviço é algo que o colega concordaria, e o colega não foi
 * consultado — vincular terceiros fica reservado a quem já tem visão de tudo (admin) ou
 * ao próprio barbeiro, que pode se auto-vincular depois em "Meus serviços" quando quiser.
 * Sem nenhum vínculo (ex.: nenhum barbeiro cadastrado ainda), o serviço fica invisível no
 * catálogo público até alguém vincular (`GET /publico/servicos` só lista serviço com pelo
 * menos 1 vínculo ativo) — comportamento aceito, não um bug.
 */
export async function criarServico(db: Db, dados: CriarServicoInput, escopo: EscopoAutorizacao) {
  return db.transaction(async (tx) => {
    const [servico] = await tx.insert(servicos).values(dados).returning();
    if (!servico) throw new Error("Falha inesperada ao criar serviço.");

    const idsParaVincular = escopo.admin
      ? (await tx.select({ id: barbeiros.id }).from(barbeiros)).map((b) => b.id)
      : escopo.barbeiroId !== null
        ? [escopo.barbeiroId]
        : [];

    if (idsParaVincular.length > 0) {
      await tx.insert(barbeiroServicos).values(idsParaVincular.map((barbeiroId) => ({ barbeiroId, servicoId: servico.id, ativo: true })));
    }

    return servico;
  });
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

/** Barbeiros com vínculo ativo para este serviço (Fase D — "quem faz"). */
export async function listarBarbeirosDoServico(db: Db, servicoId: number) {
  return db
    .select({ id: barbeiros.id, nome: usuarios.nome })
    .from(barbeiroServicos)
    .innerJoin(barbeiros, eq(barbeiroServicos.barbeiroId, barbeiros.id))
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(and(eq(barbeiroServicos.servicoId, servicoId), eq(barbeiroServicos.ativo, true)));
}
