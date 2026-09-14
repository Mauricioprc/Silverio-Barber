import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../../db/client";
import { barbeiros, clientes, disponibilidadeBarbeiro, ocupacoesBarbeiro, servicos, usuarios } from "../../db/schema";
import type { EnviadorWhatsapp } from "../../shared/whatsapp/enviador-whatsapp";
import { criarAgendamento } from "../agendamentos/agendamentos.service";
import { inicioDoDiaSeguinte } from "../agendamentos/data.util";
import type { AgendamentoPublicoInput } from "./publico.schema";
import { subtrairIntervalos, type Intervalo } from "./disponibilidade.util";

export class TelefoneNaoVerificadoError extends Error {
  constructor() {
    super("Telefone ainda não verificado. Complete a verificação por WhatsApp antes de agendar.");
    this.name = "TelefoneNaoVerificadoError";
  }
}

export async function listarServicosPublicos(db: Db) {
  return db
    .select({ id: servicos.id, nome: servicos.nome, descricao: servicos.descricao, valorCentavos: servicos.valorCentavos, duracaoMinutos: servicos.duracaoMinutos })
    .from(servicos)
    .where(eq(servicos.ativo, true));
}

/**
 * Não expõe telefone do barbeiro (dado de contato interno, sem motivo pra ficar
 * público) — diferente de `barbeiros.service.listarBarbeiros` (uso interno/balcão), que
 * traz nome+telefone do usuário associado.
 */
export async function listarBarbeirosPublicos(db: Db) {
  return db
    .select({ id: barbeiros.id, nome: usuarios.nome })
    .from(barbeiros)
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(eq(barbeiros.ativo, true));
}

/**
 * Cruza `disponibilidade_barbeiro` (janelas de trabalho recorrentes, Fase 1) com
 * `ocupacoes_barbeiro` (agendamentos+bloqueios já existentes, Fase 2) pra devolver os
 * intervalos livres do dia — não é uma tabela nova, é leitura sobre o que já existe (ver
 * escopo da Fase 4). O cálculo de subtração de intervalos em si é puro, sem banco — ver
 * `disponibilidade.util.ts`.
 */
export async function calcularDisponibilidade(db: Db, barbeiroId: number, data: string): Promise<Intervalo[]> {
  const diaSemana = new Date(`${data}T00:00:00Z`).getUTCDay();

  const janelas = await db
    .select({ horaInicio: disponibilidadeBarbeiro.horaInicio, horaFim: disponibilidadeBarbeiro.horaFim })
    .from(disponibilidadeBarbeiro)
    .where(and(eq(disponibilidadeBarbeiro.barbeiroId, barbeiroId), eq(disponibilidadeBarbeiro.diaSemana, diaSemana)));

  if (janelas.length === 0) return [];

  const inicioDia = `${data} 00:00:00`;
  const inicioDiaSeguinte = inicioDoDiaSeguinte(data);

  const ocupacoes = await db
    .select({ inicio: ocupacoesBarbeiro.inicio, fim: ocupacoesBarbeiro.fim })
    .from(ocupacoesBarbeiro)
    .where(
      and(
        eq(ocupacoesBarbeiro.barbeiroId, barbeiroId),
        lt(ocupacoesBarbeiro.inicio, inicioDiaSeguinte),
        gt(ocupacoesBarbeiro.fim, inicioDia)
      )
    );

  const livres = janelas.flatMap((janela) =>
    subtrairIntervalos({ inicio: `${data} ${janela.horaInicio}`, fim: `${data} ${janela.horaFim}` }, ocupacoes)
  );

  return livres.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Cria o agendamento público (exige `telefone_verificado = true` — regra desta fase) e,
 * se `aceitaMensagensAutomaticas` for `true`, dispara a confirmação via template (regra
 * 9: só envia com opt-in explícito). Reaproveita `criarAgendamento` (Fase 2/3) — mesma
 * trava de conflito, nenhuma regra de concorrência nova aqui.
 */
export async function criarAgendamentoPublico(
  db: Db,
  enviador: EnviadorWhatsapp,
  nomeTemplateConfirmacao: string,
  clienteId: number,
  dados: AgendamentoPublicoInput
) {
  const [cliente] = await db
    .select({ nome: clientes.nome, telefone: clientes.telefone, telefoneVerificado: clientes.telefoneVerificado })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!cliente) {
    throw new Error("Cliente da sessão não encontrado — sessão inconsistente.");
  }
  if (!cliente.telefoneVerificado) {
    throw new TelefoneNaoVerificadoError();
  }

  const [servico] = await db.select({ nome: servicos.nome }).from(servicos).where(eq(servicos.id, dados.servicoId)).limit(1);

  const agendamento = await criarAgendamento(db, {
    barbeiroId: dados.barbeiroId,
    servicoId: dados.servicoId,
    clienteId,
    inicio: dados.inicio,
    aceitaMensagensAutomaticas: dados.aceitaMensagensAutomaticas === true,
  });

  if (dados.aceitaMensagensAutomaticas === true) {
    await enviador.enviarTemplate(cliente.telefone, nomeTemplateConfirmacao, [
      cliente.nome,
      servico?.nome ?? "serviço",
      agendamento.inicio,
      formatarReais(agendamento.valorCobradoCentavos),
    ]);
  }

  return agendamento;
}
