import { and, eq, gt, ne } from "drizzle-orm";
import type { Db } from "../../db/client";
import { sessoes } from "../../db/schema";
import { gerarTokenOpaco } from "./token.util";

export const NOME_COOKIE_SESSAO = "silverio_sessao";
export const DURACAO_SESSAO_DIAS = 30;

function calcularExpiracao(): Date {
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + DURACAO_SESSAO_DIAS);
  return expiraEm;
}

/** Cria uma sessão persistida no banco para o usuário e devolve o token a colocar no cookie. */
export async function criarSessao(db: Db, usuarioId: number): Promise<{ token: string; expiraEm: Date }> {
  const token = gerarTokenOpaco();
  const expiraEm = calcularExpiracao();

  await db.insert(sessoes).values({
    id: token,
    usuarioId,
    expiraEm,
  });

  return { token, expiraEm };
}

/** Retorna o `usuarioId` dono da sessão se o token existir e ainda não tiver expirado. */
export async function obterUsuarioDaSessao(db: Db, token: string): Promise<number | null> {
  const [sessao] = await db
    .select({ usuarioId: sessoes.usuarioId })
    .from(sessoes)
    .where(and(eq(sessoes.id, token), gt(sessoes.expiraEm, new Date())))
    .limit(1);

  return sessao?.usuarioId ?? null;
}

/** Remove a sessão do banco (logout). Idempotente — não falha se o token não existir. */
export async function destruirSessao(db: Db, token: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.id, token));
}

/**
 * Derruba todas as sessões do usuário, exceto a atual — usada depois de trocar
 * telefone/senha (`PUT /auth/me`, `PUT /auth/senha`): quem fez a troca continua logado
 * nesta aba, mas qualquer outra sessão ativa (ex.: token vazado, aparelho esquecido
 * logado) para de valer imediatamente.
 */
export async function destruirOutrasSessoes(db: Db, usuarioId: number, tokenAtual: string): Promise<void> {
  await db.delete(sessoes).where(and(eq(sessoes.usuarioId, usuarioId), ne(sessoes.id, tokenAtual)));
}
