import { and, count, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { aprovacoesSocio, barbeiros, solicitacoesSocio, usuarios } from "../../db/schema";
import { gerarHashSenha, verificarSenha } from "./senha.util";
import type { CriarSolicitacaoSocioInput, LoginInput, RegistrarSocioInput } from "./auth.schema";

/** Número de sócios criados livremente via `registrar-socio` antes do bootstrap se fechar. */
const MAX_SOCIOS_BOOTSTRAP = 2;

export class BootstrapEncerradoError extends Error {
  constructor() {
    super(
      `Cadastro de sócio via bootstrap já foi concluído (limite de ${MAX_SOCIOS_BOOTSTRAP} ` +
        "sócios). Para adicionar um novo sócio, use POST /api/auth/solicitacoes-socio " +
        "(exige aprovação de todos os sócios ativos)."
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

export class SolicitacaoNaoEncontradaError extends Error {
  constructor() {
    super("Solicitação de novo sócio não encontrada.");
    this.name = "SolicitacaoNaoEncontradaError";
  }
}

export class SolicitacaoNaoPendenteError extends Error {
  constructor() {
    super("Esta solicitação já foi resolvida (aprovada ou rejeitada).");
    this.name = "SolicitacaoNaoPendenteError";
  }
}

export class AprovacaoDuplicadaError extends Error {
  constructor() {
    super("Você já aprovou esta solicitação.");
    this.name = "AprovacaoDuplicadaError";
  }
}

async function contarUsuarios(db: Db): Promise<number> {
  const [linha] = await db.select({ total: count() }).from(usuarios);
  return linha?.total ?? 0;
}

/**
 * Cria um usuário-sócio + registro de barbeiro. Bootstrap livre apenas para os
 * `MAX_SOCIOS_BOOTSTRAP` primeiros sócios (ver README.md) — a partir daí recusa
 * (lançando `BootstrapEncerradoError`) e o caminho passa a ser
 * `criarSolicitacaoSocio`/`aprovarSolicitacaoSocio`, que exige aprovação de todos os
 * sócios ativos.
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

/**
 * Um sócio logado propõe um novo sócio (3º, 4º, ...). O solicitante conta como tendo
 * aprovado automaticamente. Se, mesmo assim, isso já bastar para atingir o total de
 * sócios ativos (ex.: só 1 sócio ativo no momento), a conta é criada imediatamente.
 */
export async function criarSolicitacaoSocio(db: Db, solicitanteId: number, dados: CriarSolicitacaoSocioInput) {
  const senhaHash = await gerarHashSenha(dados.senha);

  const [solicitacao] = await db
    .insert(solicitacoesSocio)
    .values({
      nome: dados.nome,
      telefone: dados.telefone,
      senhaHash,
      solicitadoPor: solicitanteId,
    })
    .returning();

  if (!solicitacao) {
    throw new Error("Falha inesperada ao criar solicitação de novo sócio.");
  }

  await db.insert(aprovacoesSocio).values({ solicitacaoId: solicitacao.id, usuarioId: solicitanteId });

  return resolverSolicitacaoSeCompleta(db, solicitacao.id);
}

export async function listarSolicitacoesSocio(db: Db) {
  const solicitacoes = await db.select().from(solicitacoesSocio);
  const aprovacoes = await db.select().from(aprovacoesSocio);

  return solicitacoes.map((solicitacao) => ({
    ...solicitacao,
    aprovacoesDe: aprovacoes.filter((a) => a.solicitacaoId === solicitacao.id).map((a) => a.usuarioId),
  }));
}

async function buscarSolicitacaoPendente(db: Db, solicitacaoId: number) {
  const [solicitacao] = await db
    .select()
    .from(solicitacoesSocio)
    .where(eq(solicitacoesSocio.id, solicitacaoId))
    .limit(1);

  if (!solicitacao) {
    throw new SolicitacaoNaoEncontradaError();
  }
  if (solicitacao.status !== "pendente") {
    throw new SolicitacaoNaoPendenteError();
  }
  return solicitacao;
}

/**
 * Registra a aprovação de `usuarioId` para a solicitação. Quando o número de aprovações
 * atinge o número de sócios ativos no momento, cria a conta (usuário + barbeiro) e marca
 * a solicitação como `aprovada`.
 */
export async function aprovarSolicitacaoSocio(db: Db, solicitacaoId: number, usuarioId: number) {
  await buscarSolicitacaoPendente(db, solicitacaoId);

  const [jaAprovou] = await db
    .select({ id: aprovacoesSocio.id })
    .from(aprovacoesSocio)
    .where(and(eq(aprovacoesSocio.solicitacaoId, solicitacaoId), eq(aprovacoesSocio.usuarioId, usuarioId)))
    .limit(1);

  if (jaAprovou) {
    throw new AprovacaoDuplicadaError();
  }

  await db.insert(aprovacoesSocio).values({ solicitacaoId, usuarioId });

  return resolverSolicitacaoSeCompleta(db, solicitacaoId);
}

export async function rejeitarSolicitacaoSocio(db: Db, solicitacaoId: number) {
  const solicitacao = await buscarSolicitacaoPendente(db, solicitacaoId);

  const [atualizada] = await db
    .update(solicitacoesSocio)
    .set({ status: "rejeitada", resolvidaEm: new Date() })
    .where(eq(solicitacoesSocio.id, solicitacao.id))
    .returning();

  return atualizada;
}

/**
 * Verifica se o total de aprovações já cobre todos os sócios ativos; se sim, cria a
 * conta do novo sócio e fecha a solicitação como `aprovada` dentro de uma transação
 * (aprovar e criar a conta precisam ser atômicos). Retorna a solicitação (com
 * `usuarioCriado` preenchido só quando a conta acabou de ser criada nesta chamada).
 */
async function resolverSolicitacaoSeCompleta(db: Db, solicitacaoId: number) {
  return db.transaction(async (tx) => {
    const [solicitacao] = await tx
      .select()
      .from(solicitacoesSocio)
      .where(eq(solicitacoesSocio.id, solicitacaoId))
      .limit(1);

    if (!solicitacao || solicitacao.status !== "pendente") {
      return { solicitacao, usuarioCriado: null };
    }

    const [linhaAprovacoes] = await tx
      .select({ total: count() })
      .from(aprovacoesSocio)
      .where(eq(aprovacoesSocio.solicitacaoId, solicitacaoId));

    const [linhaSocios] = await tx.select({ total: count() }).from(barbeiros).where(eq(barbeiros.ativo, true));

    const totalAprovacoes = linhaAprovacoes?.total ?? 0;
    const sociosAtivos = linhaSocios?.total ?? 0;

    if (totalAprovacoes < Math.max(sociosAtivos, 1)) {
      return { solicitacao, usuarioCriado: null };
    }

    const [usuario] = await tx
      .insert(usuarios)
      .values({ nome: solicitacao.nome, telefone: solicitacao.telefone, senhaHash: solicitacao.senhaHash })
      .returning({ id: usuarios.id, nome: usuarios.nome, telefone: usuarios.telefone });

    if (!usuario) {
      throw new Error("Falha inesperada ao criar usuário aprovado.");
    }

    const [barbeiro] = await tx
      .insert(barbeiros)
      .values({ usuarioId: usuario.id })
      .returning({ id: barbeiros.id, ativo: barbeiros.ativo });

    const [atualizada] = await tx
      .update(solicitacoesSocio)
      .set({ status: "aprovada", resolvidaEm: new Date() })
      .where(eq(solicitacoesSocio.id, solicitacaoId))
      .returning();

    return { solicitacao: atualizada, usuarioCriado: { usuario, barbeiro } };
  });
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
