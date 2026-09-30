/**
 * Link `wa.me` genérico (sem mensagem pré-preenchida) — usado onde não há um
 * agendamento específico pra compor a mensagem que `/agendamentos/:id/link-whatsapp`
 * monta no back-end (ver `mensagemManual.util.ts`). Mesma normalização de telefone que o
 * back-end já faz: dígitos apenas, com DDI 55 assumido quando o telefone gravado não tem
 * um (fixo/celular BR têm 10/11 dígitos sem DDI).
 */
export function linkWhatsapp(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${comDdi}`;
}
