import { count, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiros, usuarios } from "../../db/schema";
import { gerarHashSenha, verificarSenha } from "../../shared/senha/senha.util";
import type { LoginInput, RegistrarSocioInput } from "./auth.schema";

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
    super("Telefone ou senha inválidos.");
    this.name = "CredenciaisInvalidasError";
  }
}

async function contarUsuarios(db: Db): Promise<number> {
  const [linha] = await db.select({ total: count() }).from(usuarios);
  return linha?.total ?? 0;
}

/**
 * Cria um usuário-sócio + registro de barbeiro. Bootstrap livre apenas para os
 * `MAX_SOCIOS_BOOTSTRAP` primeiros sócios (ver README.md) — a partir daí recusa,
 * lançando `BootstrapEncerradoError`. Não existe fluxo alternativo para adicionar mais
 * sócios: o modelo de negócio é de 2 sócios fixos (ver planejamento-geral.md); um 3º
 * sócio, se um dia necessário, é uma ação administrativa pontual fora da aplicação.
 */
export async function registrarSocio(db: Db, dados: RegistrarSocioInput) {
  const total = await contarUsuarios(db);
  if (total >= MAX_SOCIOS_BOOTSTRAP) {
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
