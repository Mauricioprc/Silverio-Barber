import { and, eq, gte, lt } from "drizzle-orm";
import type { Db } from "../../db/client";
import { agendamentos, barbeiros, servicos, usuarios } from "../../db/schema";
import { dataBrasilia } from "../../shared/fuso/fuso.util";
import type { EnviadorWhatsapp } from "../../shared/whatsapp/enviador-whatsapp";

function somarDias(data: string, dias: number): string {
  const dia = new Date(`${data}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dia.getUTCFullYear()}-${pad(dia.getUTCMonth() + 1)}-${pad(dia.getUTCDate())}`;
}

/**
 * "Quem precisa de lembrete agora": agendamentos confirmados do dia seguinte (em
 * Brasília, a partir de `agora`) cujo cliente deu opt-in (`aceitaMensagensAutomaticas`
 * — regra 9). Função pura de leitura, testável isoladamente e separada do envio em si
 * (`enviarLembretes`) — ver escopo da Fase 4: "não é necessário implementar o mecanismo
 * de agendamento do job nesta fase", só esta função precisa existir e funcionar.
 */
export async function obterAgendamentosParaLembrete(db: Db, agora: Date) {
  const amanha = somarDias(dataBrasilia(agora), 1);
  const depoisDeAmanha = somarDias(amanha, 1);

  return db
    .select({
      id: agendamentos.id,
      telefoneCliente: agendamentos.telefoneCliente,
      nomeCliente: agendamentos.nomeCliente,
      inicio: agendamentos.inicio,
      nomeServico: servicos.nome,
      nomeBarbeiro: usuarios.nome,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(agendamentos.servicoId, servicos.id))
    .innerJoin(barbeiros, eq(agendamentos.barbeiroId, barbeiros.id))
    .innerJoin(usuarios, eq(barbeiros.usuarioId, usuarios.id))
    .where(
      and(
        eq(agendamentos.status, "confirmado"),
        eq(agendamentos.aceitaMensagensAutomaticas, true),
        gte(agendamentos.inicio, `${amanha} 00:00:00`),
        lt(agendamentos.inicio, `${depoisDeAmanha} 00:00:00`)
      )
    );
}

/** Envia o lembrete (template) para cada agendamento retornado por `obterAgendamentosParaLembrete`. */
export async function enviarLembretes(
  db: Db,
  enviador: EnviadorWhatsapp,
  nomeTemplateLembrete: string,
  agora: Date
): Promise<{ enviados: number }> {
  const lista = await obterAgendamentosParaLembrete(db, agora);

  for (const agendamento of lista) {
    await enviador.enviarTemplate(agendamento.telefoneCliente, nomeTemplateLembrete, [
      agendamento.nomeCliente,
      agendamento.nomeServico,
      agendamento.nomeBarbeiro,
      agendamento.inicio,
    ]);
  }

  return { enviados: lista.length };
}
