import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiros, usuarios } from "../../db/schema";
import { gerarHashSenha, verificarSenha } from "./senha.util";
import type { LoginInput, RegistrarSocioInput } from "./auth.schema";

export class BootstrapEncerradoError extends Error {
  constructor() {
    super("Cadastro de sócio já foi concluído. Esta rota é de bootstrap único.");
    this.name = "BootstrapEncerradoError";
  }
}

export class CredenciaisInvalidasError extends Error {
  constructor() {
    // Mensagem propositalmente genérica — regra 3 do documento de convenções: não
    // diferenciar "usuário não existe" de "senha errada".
    super("Telefone ou senha inválidos.");
    this.name = "CredenciaisInvalidasError";
  }
}

/**
 * Cria um usuário-sócio + registro de barbeiro. Rota de bootstrap único: recusa
 * (lançando `BootstrapEncerradoError`) se já existir qualquer registro em `usuarios` —
 * ver README.md para o comportamento esperado e como resetar em ambiente de
 * desenvolvimento.
 */
export async function registrarSocio(db: Db, dados: RegistrarSocioInput) {
  const [existente] = await db.select({ id: usuarios.id }).from(usuarios).limit(1);
  if (existente) {
    throw new BootstrapEncerradoError();
  }

  const senhaHash = await gerarHashSenha(dados.senha);

  const [usuario] = await db
    .insert(usuarios)
    .values({ nome: dados.nome, telefone: dados.telefone, senhaHash })
    .returning({ id: usuarios.id, nome: usuarios.nome, telefone: usuarios.telefone });

  if (!usuario) {
    throw new Error("Falha inesperada ao criar usuário.");
  }

  const [barbeiro] = await db
    .insert(barbeiros)
    .values({ usuarioId: usuario.id })
    .returning({ id: barbeiros.id, ativo: barbeiros.ativo });

  return { usuario, barbeiro };
}

/** Autentica por telefone+senha. Lança `CredenciaisInvalidasError` sem distinguir a causa. */
export async function autenticar(db: Db, dados: LoginInput) {
  const [usuario] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, telefone: usuarios.telefone, senhaHash: usuarios.senhaHash })
    .from(usuarios)
    .where(eq(usuarios.telefone, dados.telefone))
    .limit(1);

  if (!usuario) {
    throw new CredenciaisInvalidasError();
  }

  const senhaOk = await verificarSenha(dados.senha, usuario.senhaHash);
  if (!senhaOk) {
    throw new CredenciaisInvalidasError();
  }

  return { id: usuario.id, nome: usuario.nome, telefone: usuario.telefone };
}
