import { and, eq, gt } from "drizzle-orm";
import type { Db } from "../../db/client";
import { sessoesCliente } from "../../db/schema";
import { gerarTokenOpaco } from "./token.util";

/**
 * Paralelo de `sessao.util.ts`, mas para `clientes` — cookie próprio (nome diferente,
 * nunca reaproveitar `NOME_COOKIE_SESSAO` de sócio), mesma duração de 30 dias (regras 2
 * e 3 do documento de convenções valem igual para cliente).
 */
export const NOME_COOKIE_SESSAO_CLIENTE = "silverio_sessao_cliente";
export const DURACAO_SESSAO_DIAS = 30;

function calcularExpiracao(): Date {
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + DURACAO_SESSAO_DIAS);
  return expiraEm;
}

export async function criarSessaoCliente(db: Db, clienteId: number): Promise<{ token: string; expiraEm: Date }> {
  const token = gerarTokenOpaco();
  const expiraEm = calcularExpiracao();

  await db.insert(sessoesCliente).values({ id: token, clienteId, expiraEm });

  return { token, expiraEm };
}

export async function obterClienteDaSessao(db: Db, token: string): Promise<number | null> {
  const [sessao] = await db
    .select({ clienteId: sessoesCliente.clienteId })
    .from(sessoesCliente)
    .where(and(eq(sessoesCliente.id, token), gt(sessoesCliente.expiraEm, new Date())))
    .limit(1);

  return sessao?.clienteId ?? null;
}

export async function destruirSessaoCliente(db: Db, token: string): Promise<void> {
  await db.delete(sessoesCliente).where(eq(sessoesCliente.id, token));
}
