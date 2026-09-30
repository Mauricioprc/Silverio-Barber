/**
 * Formata um telefone brasileiro só para exibição — não altera o valor
 * enviado/salvo. Aceita 10 (fixo) ou 11 (celular) dígitos; qualquer outra
 * quantidade volta como recebida, sem tentar adivinhar o formato.
 */
export function formatPhoneBR(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return telefone;
}
