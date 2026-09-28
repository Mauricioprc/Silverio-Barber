import { count, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiros, usuarios } from "../../db/schema";
import { gerarHashSenha, verificarSenha } from "../../shared/senha/senha.util";
import type { AlterarSenhaInput, AtualizarMeuPerfilInput, LoginInput, RegistrarAdminInput, RegistrarSocioInput } from "./auth.schema";

/** Número de sócios criados via `registrar-socio` antes do bootstrap se fechar. */
const MAX_SOCIOS_BOOTSTRAP = 2;

export class BootstrapEncerradoError extends Error {
  constructor() {
    super(
      `Cadastro de sócio já foi concluído (limite de ${MAX_SOCIOS_BOOTSTRAP} sócios). ` +
        "Modelo de negócio é de 2 sócios fixos, sem fluxo de expansão automatizado — " +
        "ver README.md."
    );
    this.name = "BootstrapEncerradoError";
  }
}

export class CredenciaisInvalidasError extends Error {
  constructor() {
    // Mensagem propositalmente genérica — regra 3 do documento de convenções: não
    // diferenciar "usuário não existe" de "senha errada".
    super("Usuário ou senha inválidos.");
    this.name = "CredenciaisInvalidasError";
  }
}

export class AdminJaCadastradoError extends Error {
  constructor() {
    super("Já existe uma conta administradora cadastrada.");
    this.name = "AdminJaCadastradoError";
  }
}

export class SenhaAtualIncorretaError extends Error {
  constructor() {
    super("Senha atual incorreta.");
    this.name = "SenhaAtualIncorretaError";
  }
}

export class TelefoneJaCadastradoError extends Error {
  constructor() {
    super("Telefone já está em uso por outra conta.");
    this.name = "TelefoneJaCadastradoError";
  }
}

export class UsuarioJaCadastradoError extends Error {
  constructor() {
    super("Nome de usuário já está em uso por outra conta.");
    this.name = "UsuarioJaCadastradoError";
  }
}

function ehViolacaoDeTelefoneUnico(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return /usuarios_telefone_unique/i.test(mensagem);
}

function ehViolacaoDeUsuarioUnico(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return /usuarios_usuario_unique/i.test(mensagem);
}

/** Conta só sócios (`admin = false`) — a conta admin é um bootstrap à parte (`existeAdmin`), não deve consumir o limite de `MAX_SOCIOS_BOOTSTRAP`. */
async function contarSocios(db: Db): Promise<number> {
  const [linha] = await db.select({ total: count() }).from(usuarios).where(eq(usuarios.admin, false));
  return linha?.total ?? 0;
}

async function existeAdmin(db: Db): Promise<boolean> {
  const [linha] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.admin, true)).limit(1);
  return Boolean(linha);
}

/**
 * Cria um usuário-sócio + registro de barbeiro. Bootstrap livre apenas para os
 * `MAX_SOCIOS_BOOTSTRAP` primeiros sócios (ver README.md) — a partir daí recusa,
 * lançando `BootstrapEncerradoError`. Não existe fluxo alternativo para adicionar mais
 * sócios: o modelo de negócio é de 2 sócios fixos (ver planejamento-geral.md); um 3º
 * sócio, se um dia necessário, é uma ação administrativa pontual fora da aplicação.
 */
export async function registrarSocio(db: Db, dados: RegistrarSocioInput) {
  const total = await contarSocios(db);
  if (total >= MAX_SOCIOS_BOOTSTRAP) {
    throw new BootstrapEncerradoError();
  }

  const senhaHash = await gerarHashSenha(dados.senha);

  const [usuario] = await db
    .insert(usuarios)
    .values({ nome: dados.nome, usuario: dados.usuario, telefone: dados.telefone, senhaHash })
    .returning({ id: usuarios.id, nome: usuarios.nome, usuario: usuarios.usuario, telefone: usuarios.telefone, admin: usuarios.admin });

  if (!usuario) {
    throw new Error("Falha inesperada ao criar usuário.");
  }

  const [barbeiro] = await db
    .insert(barbeiros)
    .values({ usuarioId: usuario.id })
    .returning({ id: barbeiros.id, ativo: barbeiros.ativo });

  return { usuario, barbeiro };
}

/**
 * Cria a conta de retaguarda (vê/gerencia tudo) — travada em 1 pelo mesmo motivo que o
 * bootstrap de sócio é travado em 2 (ver `README.md`): não existe fluxo de expansão pela
 * aplicação, é uma ação pontual feita uma vez via `curl` (ver `MANUAL-TESTE-LOCAL.md`).
 * Diferente de `registrarSocio`, não cria linha em `barbeiros` — admin não é um
 * profissional agendável.
 */
export async function registrarAdmin(db: Db, dados: RegistrarAdminInput) {
  if (await existeAdmin(db)) {
    throw new AdminJaCadastradoError();
  }

  const senhaHash = await gerarHashSenha(dados.senha);

  const [usuario] = await db
    .insert(usuarios)
    .values({ nome: dados.nome, usuario: dados.usuario, telefone: dados.telefone, senhaHash, admin: true })
    .returning({ id: usuarios.id, nome: usuarios.nome, usuario: usuarios.usuario, telefone: usuarios.telefone, admin: usuarios.admin });

  if (!usuario) {
    throw new Error("Falha inesperada ao criar usuário.");
  }

  return { usuario };
}

/** Busca o usuário logado pelo id da sessão (rota "quem sou eu" do front). */
export async function obterUsuarioPorId(db: Db, id: number) {
  const [usuario] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, usuario: usuarios.usuario, telefone: usuarios.telefone, admin: usuarios.admin })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  return usuario ?? null;
}

/** Autentica por usuário+senha. Lança `CredenciaisInvalidasError` sem distinguir a causa. */
export async function autenticar(db: Db, dados: LoginInput) {
  const [usuario] = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      usuario: usuarios.usuario,
      telefone: usuarios.telefone,
      senhaHash: usuarios.senhaHash,
      admin: usuarios.admin,
    })
    .from(usuarios)
    .where(eq(usuarios.usuario, dados.usuario.trim().toLowerCase()))
    .limit(1);

  if (!usuario) {
    throw new CredenciaisInvalidasError();
  }

  const senhaOk = await verificarSenha(dados.senha, usuario.senhaHash);
  if (!senhaOk) {
    throw new CredenciaisInvalidasError();
  }

  return { id: usuario.id, nome: usuario.nome, usuario: usuario.usuario, telefone: usuario.telefone, admin: usuario.admin };
}

/**
 * Atualiza o próprio nome, telefone (contato) e/ou usuário. Trocar `usuario` exige a senha
 * atual (é o login) — `atualizarMeuPerfilSchema` já garante que `senhaAtual` veio junto se
 * `usuario` veio. `telefone` é só contato, não exige senha.
 */
export async function atualizarMeuPerfil(db: Db, usuarioId: number, dados: AtualizarMeuPerfilInput) {
  if (dados.usuario !== undefined) {
    const [usuario] = await db
      .select({ senhaHash: usuarios.senhaHash })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);
    if (!usuario || !(await verificarSenha(dados.senhaAtual!, usuario.senhaHash))) {
      throw new SenhaAtualIncorretaError();
    }
  }

  const valores: Partial<typeof usuarios.$inferInsert> = {};
  if (dados.nome !== undefined) valores.nome = dados.nome;
  if (dados.telefone !== undefined) valores.telefone = dados.telefone;
  if (dados.usuario !== undefined) valores.usuario = dados.usuario;

  try {
    const [usuario] = await db
      .update(usuarios)
      .set(valores)
      .where(eq(usuarios.id, usuarioId))
      .returning({ id: usuarios.id, nome: usuarios.nome, usuario: usuarios.usuario, telefone: usuarios.telefone, admin: usuarios.admin });
    if (!usuario) {
      throw new Error("Falha inesperada ao atualizar usuário.");
    }
    return usuario;
  } catch (erro) {
    if (ehViolacaoDeUsuarioUnico(erro)) {
      throw new UsuarioJaCadastradoError();
    }
    if (ehViolacaoDeTelefoneUnico(erro)) {
      throw new TelefoneJaCadastradoError();
    }
    throw erro;
  }
}

/** Troca a senha, conferindo a senha atual antes. */
export async function alterarSenha(db: Db, usuarioId: number, dados: AlterarSenhaInput) {
  const [usuario] = await db.select({ senhaHash: usuarios.senhaHash }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  if (!usuario || !(await verificarSenha(dados.senhaAtual, usuario.senhaHash))) {
    throw new SenhaAtualIncorretaError();
  }

  const senhaHash = await gerarHashSenha(dados.senhaNova);
  await db.update(usuarios).set({ senhaHash }).where(eq(usuarios.id, usuarioId));
}
