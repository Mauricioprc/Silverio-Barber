import type { Env } from "../tipos";

/**
 * Interface que isola o envio de WhatsApp do resto da aplicação — a aprovação da conta
 * comercial da Meta e a contratação do provedor/BSP têm prazo próprio e podem não estar
 * prontas quando este código roda (ver `05-fase4-agendamento-online-whatsapp.md`). Todo
 * o resto do fluxo (cadastro, verificação, rate-limiting, agendamento) é testável e
 * funcional com a implementação mock; trocar para a real é só mudar `WHATSAPP_MODO`.
 */
export interface EnviadorWhatsapp {
  /** Mensagem de texto livre — usada para o código de verificação. */
  enviarTexto(telefone: string, mensagem: string): Promise<void>;
  /**
   * Mensagem por template aprovado pela Meta — usada para confirmação/lembrete
   * automático (mensagem iniciada pelo negócio, fora da janela de 24h, exige template
   * aprovado). `parametros` preenche as variáveis posicionais do template (`{{1}}`,
   * `{{2}}`, ...), na ordem.
   */
  enviarTemplate(telefone: string, nomeTemplate: string, parametros: string[]): Promise<void>;
}

/**
 * Implementação de desenvolvimento/teste: não faz nenhuma chamada de rede, só loga a
 * mensagem que seria enviada. `mensagensEnviadas` fica acumulado em memória — útil para
 * testes automatizados afirmarem o que foi "enviado" sem precisar interceptar
 * `console.log`.
 */
export class EnviadorWhatsappMock implements EnviadorWhatsapp {
  readonly mensagensEnviadas: Array<{ telefone: string; texto: string }> = [];

  async enviarTexto(telefone: string, mensagem: string): Promise<void> {
    console.log(`[WhatsApp mock] Para ${telefone}: ${mensagem}`);
    this.mensagensEnviadas.push({ telefone, texto: mensagem });
  }

  async enviarTemplate(telefone: string, nomeTemplate: string, parametros: string[]): Promise<void> {
    const texto = `[template=${nomeTemplate}] ${parametros.join(" | ")}`;
    console.log(`[WhatsApp mock] Para ${telefone}: ${texto}`);
    this.mensagensEnviadas.push({ telefone, texto });
  }
}

/**
 * Implementação real via WhatsApp Cloud API da Meta (`graph.facebook.com`) — o desenho
 * mais comum de integração direta (sem um BSP terceiro na frente); se o BSP contratado
 * expõe uma API diferente, troque só esta classe, a interface `EnviadorWhatsapp` não
 * muda. Ver README para as variáveis de ambiente exigidas e o checklist de produção
 * (nome do template aprovado, credenciais do BSP, requisito de "Coexistência").
 */
export class EnviadorWhatsappMetaCloudApi implements EnviadorWhatsapp {
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string
  ) {}

  private async enviar(corpo: Record<string, unknown>): Promise<void> {
    const resposta = await fetch(`https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      throw new Error(`Falha ao enviar WhatsApp (HTTP ${resposta.status}): ${detalhe}`);
    }
  }

  async enviarTexto(telefone: string, mensagem: string): Promise<void> {
    await this.enviar({ to: telefone, type: "text", text: { body: mensagem } });
  }

  async enviarTemplate(telefone: string, nomeTemplate: string, parametros: string[]): Promise<void> {
    await this.enviar({
      to: telefone,
      type: "template",
      template: {
        name: nomeTemplate,
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: parametros.map((texto) => ({ type: "text", text: texto })),
          },
        ],
      },
    });
  }
}

/**
 * Fábrica que escolhe a implementação com base em `WHATSAPP_MODO`. Padrão (env não
 * setada, ou qualquer valor diferente de `"real"`) é o mock — escolha deliberada para
 * que subir o Worker sem configurar nada nunca dispare envio de verdade por engano.
 */
export function criarEnviadorWhatsapp(env: Env): EnviadorWhatsapp {
  if (env.WHATSAPP_MODO !== "real") {
    return new EnviadorWhatsappMock();
  }

  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_MODO=real exige WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID configurados. Ver README."
    );
  }

  return new EnviadorWhatsappMetaCloudApi(env.WHATSAPP_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID);
}
