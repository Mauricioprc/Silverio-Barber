/**
 * Função pura de montagem do link `wa.me` (item 5 da Fase 4) — sem chamada de rede, só
 * string building. Não depende de `EnviadorWhatsapp`, do rate-limiting (regra 7) nem do
 * opt-in (regra 9): é o sócio mandando manualmente, não o sistema mandando sozinho — ver
 * README para a justificativa completa dessa distinção. Fica dentro de `agendamentos/`
 * porque é o único módulo que usa (convenção do projeto: util de módulo único não vai
 * pra `shared/`).
 */

export type DadosMensagemManual = {
  nomeCliente: string;
  telefoneCliente: string;
  nomeServico: string;
  nomeBarbeiro: string;
  inicio: string; // "YYYY-MM-DD HH:MM:SS", horário local — ver db/schema.ts
  valorCobradoCentavos: number;
};

/** Dígitos apenas, com DDI — assume Brasil (55) se o telefone gravado não tiver DDI. */
function normalizarTelefoneParaWa(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  // Telefone brasileiro sem DDI tem 10 (fixo) ou 11 (celular, com o 9) dígitos.
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

function formatarDataHora(horarioLocal: string): string {
  const [data, hora] = horarioLocal.split(" ");
  const [ano, mes, dia] = (data ?? "").split("-");
  return `${dia}/${mes}/${ano} às ${(hora ?? "").slice(0, 5)}`;
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function montarLinkWhatsapp(dados: DadosMensagemManual): string {
  const mensagem =
    `Olá, ${dados.nomeCliente}! Confirmando seu horário na Silvério Barbearia: ` +
    `${dados.nomeServico} com ${dados.nomeBarbeiro}, ${formatarDataHora(dados.inicio)}. ` +
    `Valor: ${formatarReais(dados.valorCobradoCentavos)}.`;

  const telefone = normalizarTelefoneParaWa(dados.telefoneCliente);
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
