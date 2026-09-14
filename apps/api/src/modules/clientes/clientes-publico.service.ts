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
 * na Fase 3, sem senha conhecida pelo próprio cliente), **vincula à conta existente**,
 * mas NÃO troca `senhaHash`/`nome` na hora — quem chamou essa rota só provou conhecer o
 * telefone (dado que não é segredo), não que é o dono dele. A senha/nome informados ficam
 * em `senhaHashPendente`/`nomePendente` e só são aplicados quando o telefone for
 * confirmado de verdade via código por WhatsApp (`verificacao.service.ts`,
 * `confirmarCodigoVerificacao`) — ver comentário em `db/schema.ts` para o raciocínio
 * completo (isso fecha um sequestro de conta: sem essa trava, bastava saber o telefone de
 * um cliente já cadastrado pra assumir a conta dele).
 *
 * `telefoneVerificado` é forçado para `false` neste caminho mesmo que já estivesse
 * `true` antes — sem isso, alguém que soubesse o telefone de um cliente já verificado
 * herdaria esse `true` e conseguiria agendar (`POST /api/publico/agendamentos` exige
 * `telefoneVerificado = true`) antes mesmo de provar posse do telefone.
 *
 * Uma sessão é iniciada de qualquer forma (ver rota) para permitir chamar
 * `/verificacao/enviar` e `/confirmar` em seguida — mas até a verificação ser concluída,
 * a conta continua com a senha/nome originais (do balcão), não os que acabaram de ser
 * enviados nesta chamada.
 */
export async function cadastrarClientePublico(db: Db, dados: CadastroPublicoInput): Promise<{ id: number; vinculado: boolean }> {
  const senhaHash = await gerarHashSenha(dados.senha);

  const [existente] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.telefone, dados.telefone)).limit(1);

  if (existente) {
    await db
      .update(clientes)
      .set({ nomePendente: dados.nome, senhaHashPendente: senhaHash, telefoneVerificado: false })
      .where(eq(clientes.id, existente.id));
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
