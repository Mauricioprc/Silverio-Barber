import { count, desc, eq, ilike, or } from "drizzle-orm";
import type { Db } from "../../db/client";
import { agendamentos, clientes } from "../../db/schema";
import type { PaginacaoInput } from "../../shared/http/paginacao.schema";
import { gerarHashSenha } from "../../shared/senha/senha.util";
import type { CriarClienteInput, EditarClienteInput } from "./clientes.schema";

export class TelefoneJaCadastradoError extends Error {
  constructor() {
    // Diferente do erro de login (regra 3 — genérico de propósito): aqui quem está
    // cadastrando é o sócio no balcão, não o próprio cliente tentando adivinhar contas
    // alheias, então um erro específico é aceitável e mais útil (ver escopo da Fase 3).
    super("Telefone já cadastrado.");
    this.name = "TelefoneJaCadastradoError";
  }
}

export class ClienteNaoEncontradoError extends Error {
  constructor() {
    super("Cliente não encontrado.");
    this.name = "ClienteNaoEncontradoError";
  }
}

function ehViolacaoDeTelefoneUnico(erro: unknown): boolean {
  const codigo = (erro as { code?: unknown } | null)?.code;
  if (codigo === "23505") return true;
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return /clientes_telefone_unique/i.test(mensagem);
}

/**
 * Paginado (correção pós-auditoria — ver `shared/http/paginacao.schema.ts`): devolve só
 * a página pedida (`limite`/`offset`) mais `total` (contagem sem paginação, pra o
 * chamador montar "página X de Y"), em vez da tabela inteira de uma vez.
 *
 * Projeção explícita de colunas (correção — Fase 4 do front): `db.select()` sem
 * projeção devolvia `senhaHash`/`senhaHashPendente` pro chamador — essa listagem é a
 * única rota do sistema que expunha isso, as demais (`criarCliente`/`editarCliente`) já
 * projetavam campos seguros. Descoberto ao construir a tela de busca de clientes do
 * painel, que teria vazado hash de senha pro browser do sócio a cada busca.
 */
export async function listarClientes(db: Db, paginacao: PaginacaoInput, busca?: string) {
  const condicao = busca ? or(ilike(clientes.nome, `%${busca}%`), ilike(clientes.telefone, `%${busca}%`)) : undefined;
  const colunas = {
    id: clientes.id,
    nome: clientes.nome,
    telefone: clientes.telefone,
    telefoneVerificado: clientes.telefoneVerificado,
    criadoEm: clientes.criadoEm,
  };

  const [itens, contagem] = await Promise.all([
    db.select(colunas).from(clientes).where(condicao).limit(paginacao.limite).offset(paginacao.offset),
    db.select({ total: count() }).from(clientes).where(condicao),
  ]);

  return { itens, total: contagem[0]?.total ?? 0 };
}

export async function criarCliente(db: Db, dados: CriarClienteInput) {
  const senhaHash = await gerarHashSenha(dados.senha);
  try {
    const [cliente] = await db
      .insert(clientes)
      .values({ nome: dados.nome, telefone: dados.telefone, senhaHash })
      .returning({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone, telefoneVerificado: clientes.telefoneVerificado, criadoEm: clientes.criadoEm });
    return cliente;
  } catch (erro) {
    if (ehViolacaoDeTelefoneUnico(erro)) {
      throw new TelefoneJaCadastradoError();
    }
    throw erro;
  }
}

/**
 * Histórico básico do cliente (Fase 4 do front) — não existia nenhuma forma de listar
 * agendamentos por `clienteId` até aqui (`listarAgendamentosQuerySchema` exige
 * `barbeiro_id`+`data`, pensado pra visão diária do balcão, não pra histórico de um
 * cliente). Paginado desde o início, mesmo padrão de `listarClientes`.
 */
export async function listarAgendamentosDoCliente(db: Db, clienteId: number, limite: number, offset: number) {
  const [itens, contagem] = await Promise.all([
    db
      .select()
      .from(agendamentos)
      .where(eq(agendamentos.clienteId, clienteId))
      .orderBy(desc(agendamentos.inicio))
      .limit(limite)
      .offset(offset),
    db.select({ total: count() }).from(agendamentos).where(eq(agendamentos.clienteId, clienteId)),
  ]);

  return { itens, total: contagem[0]?.total ?? 0 };
}

export async function editarCliente(db: Db, id: number, dados: EditarClienteInput) {
  const valores: Partial<typeof clientes.$inferInsert> = {};
  if (dados.nome !== undefined) valores.nome = dados.nome;
  if (dados.telefone !== undefined) valores.telefone = dados.telefone;
  if (dados.senha !== undefined) valores.senhaHash = await gerarHashSenha(dados.senha);

  try {
    const [cliente] = await db
      .update(clientes)
      .set(valores)
      .where(eq(clientes.id, id))
      .returning({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone, telefoneVerificado: clientes.telefoneVerificado, criadoEm: clientes.criadoEm });
    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }
    return cliente;
  } catch (erro) {
    if (ehViolacaoDeTelefoneUnico(erro)) {
      throw new TelefoneJaCadastradoError();
    }
    throw erro;
  }
}
