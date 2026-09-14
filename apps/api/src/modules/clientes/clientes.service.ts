import { eq, ilike, or } from "drizzle-orm";
import type { Db } from "../../db/client";
import { clientes } from "../../db/schema";
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

export async function listarClientes(db: Db, busca?: string) {
  if (busca) {
    const termo = `%${busca}%`;
    return db.select().from(clientes).where(or(ilike(clientes.nome, termo), ilike(clientes.telefone, termo)));
  }
  return db.select().from(clientes);
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
