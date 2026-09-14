import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { clientes } from "../../db/schema";
import { gerarHashSenha, verificarSenha } from "../../shared/senha/senha.util";
import type { CadastroPublicoInput, LoginPublicoInput } from "./clientes-publico.schema";

export class CredenciaisInvalidasError extends Error {
  constructor() {
    // Genérico de propósito — mesma regra 3 do login de sócio, vale igual para cliente.
    super("Telefone ou senha inválidos.");
    this.name = "CredenciaisInvalidasError";
  }
}

/**
 * Cadastro público. Se o telefone já existir em `clientes` (cadastro feito pelo balcão
 * na Fase 3, sem senha conhecida pelo próprio cliente), **vincula à conta existente**:
 * atualiza `senhaHash` (e `nome`, com o que o cliente informou agora — mais autoritativo
 * que o que o balcão digitou) em vez de tentar criar um segundo registro para o mesmo
 * telefone, o que violaria a constraint única e, mais importante, criaria duas contas
 * para a mesma pessoa. `telefoneVerificado` não é alterado aqui — cadastro (público ou
 * pelo balcão) nunca verifica o telefone sozinho, isso só acontece no fluxo de
 * `verificacao.service.ts`.
 */
export async function cadastrarClientePublico(db: Db, dados: CadastroPublicoInput): Promise<{ id: number; vinculado: boolean }> {
  const senhaHash = await gerarHashSenha(dados.senha);

  const [existente] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.telefone, dados.telefone)).limit(1);

  if (existente) {
    await db.update(clientes).set({ nome: dados.nome, senhaHash }).where(eq(clientes.id, existente.id));
    return { id: existente.id, vinculado: true };
  }

  const [cliente] = await db
    .insert(clientes)
    .values({ nome: dados.nome, telefone: dados.telefone, senhaHash })
    .returning({ id: clientes.id });

  if (!cliente) {
    throw new Error("Falha inesperada ao cadastrar cliente.");
  }

  return { id: cliente.id, vinculado: false };
}

export async function autenticarClientePublico(db: Db, dados: LoginPublicoInput) {
  const [cliente] = await db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone, senhaHash: clientes.senhaHash, telefoneVerificado: clientes.telefoneVerificado })
    .from(clientes)
    .where(eq(clientes.telefone, dados.telefone))
    .limit(1);

  if (!cliente) {
    throw new CredenciaisInvalidasError();
  }

  const senhaOk = await verificarSenha(dados.senha, cliente.senhaHash);
  if (!senhaOk) {
    throw new CredenciaisInvalidasError();
  }

  return { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone, telefoneVerificado: cliente.telefoneVerificado };
}
