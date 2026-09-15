import { and, eq, gte } from "drizzle-orm";
import type { Db } from "../../db/client";
import { tentativasAcesso } from "../../db/schema";

/**
 * Guarda-defesa genérico de força-bruta/abuso (correção pós-auditoria — ver
 * `07-auditoria-geral-backend.md`, itens "login sem rate limit" e "cadastro público sem
 * rate limit"). Mesmo raciocínio da regra 7 do documento de convenções (limite por
 * identificador + limite complementar por IP, dentro de uma janela deslizante), mas sem
 * o backoff progressivo de `verificacao.service.ts` — aqui não há custo de envio de
 * mensagem por tentativa, só limite simples de contagem por janela é suficiente para os
 * três contextos que reaproveitam esta função: login de sócio, login de cliente e
 * cadastro público.
 *
 * Cada tentativa é contada (sucesso ou falha) — quem chama esta função deve chamá-la
 * ANTES de tentar a ação (autenticar, cadastrar), nunca só depois de uma falha: contar a
 * tentativa em si (não só falhas) é o que impede um atacante de gastar tentativas de
 * graça só porque acertou a credencial de primeira, e cobre igualmente o caso de
 * cadastro público (que não tem "sucesso"/"falha" no sentido de senha certa/errada, mas
 * ainda precisa de limite — ver auditoria, item 2.2).
 */

export class LimiteTentativasError extends Error {
  constructor(public readonly retryAfterSegundos: number) {
    super("Muitas tentativas. Aguarde antes de tentar novamente.");
    this.name = "LimiteTentativasError";
  }
}

export type ContextoTentativa = "login_socio" | "login_cliente" | "cadastro_publico";

type LimiteConfig = {
  maxPorIdentificadorNaJanela: number;
  maxPorIpNaJanela: number;
  janelaMs: number;
};

/** Login (sócio ou cliente): telefone digitado errado algumas vezes é normal, mas não sem limite. */
export const LIMITE_LOGIN: LimiteConfig = {
  maxPorIdentificadorNaJanela: 5,
  maxPorIpNaJanela: 20,
  janelaMs: 15 * 60_000,
};

/**
 * Cadastro público: limite por telefone impede que alguém force repetidamente
 * `telefone_verificado` de volta para `false` num cliente alheio (ver
 * `clientes-publico.service.ts`); limite por IP dificulta o mesmo abuso rotacionando
 * telefones.
 */
export const LIMITE_CADASTRO_PUBLICO: LimiteConfig = {
  maxPorIdentificadorNaJanela: 5,
  maxPorIpNaJanela: 20,
  janelaMs: 15 * 60_000,
};

/**
 * Verifica os dois limites (por `identificador` e por `ip`, dentro da janela) e, se
 * nenhum foi excedido, registra a tentativa. Lança `LimiteTentativasError` sem registrar
 * nada se algum limite já tiver sido atingido — a tentativa bloqueada não conta como uma
 * tentativa nova.
 */
export async function verificarLimiteTentativas(
  db: Db,
  contexto: ContextoTentativa,
  identificador: string,
  ip: string,
  config: LimiteConfig
): Promise<void> {
  const agora = new Date();
  const inicioJanela = new Date(agora.getTime() - config.janelaMs);

  const porIdentificador = await db
    .select({ id: tentativasAcesso.id })
    .from(tentativasAcesso)
    .where(
      and(
        eq(tentativasAcesso.contexto, contexto),
        eq(tentativasAcesso.identificador, identificador),
        gte(tentativasAcesso.criadoEm, inicioJanela)
      )
    );
  if (porIdentificador.length >= config.maxPorIdentificadorNaJanela) {
    throw new LimiteTentativasError(Math.ceil(config.janelaMs / 1000));
  }

  const porIp = await db
    .select({ id: tentativasAcesso.id })
    .from(tentativasAcesso)
    .where(and(eq(tentativasAcesso.contexto, contexto), eq(tentativasAcesso.ip, ip), gte(tentativasAcesso.criadoEm, inicioJanela)));
  if (porIp.length >= config.maxPorIpNaJanela) {
    throw new LimiteTentativasError(Math.ceil(config.janelaMs / 1000));
  }

  await db.insert(tentativasAcesso).values({ contexto, identificador, ip });
}
