import { ApiError } from "./api-client";

/**
 * Mapa de status HTTP para mensagem humana — centralizado, nunca decidido componente a
 * componente (ver documento de convenções, tabela "Tratamento de erro").
 */
export function mensagemHumana(erro: unknown): string {
  if (!(erro instanceof ApiError)) {
    return "Algo deu errado do nosso lado. Tente novamente em instantes.";
  }

  switch (erro.status) {
    case 0:
      return "Não conseguimos conectar. Verifique sua internet e tente novamente.";
    case 401:
      return "Sua sessão expirou, entre novamente.";
    case 409:
      return "Esse horário acabou de ser reservado. Veja os horários disponíveis atualizados abaixo.";
    case 429:
      return "Você solicitou o código muitas vezes. Aguarde alguns minutos e tente de novo.";
    case 400:
    case 422:
      return erro.message || "Verifique os dados informados.";
    default:
      return "Algo deu errado do nosso lado. Tente novamente em instantes.";
  }
}
