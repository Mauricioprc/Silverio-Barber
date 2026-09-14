const DURACAO_CODIGO_MINUTOS = 10;

/** Código numérico de 6 dígitos, aleatório e criptograficamente seguro. */
export function gerarCodigo(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const numero = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return String(numero).padStart(6, "0");
}

export function calcularExpiracaoCodigo(): Date {
  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + DURACAO_CODIGO_MINUTOS);
  return expiraEm;
}

/** SHA-256 do código — ver justificativa de não usar PBKDF2 aqui em `db/schema.ts`. */
export async function hashCodigo(codigo: string): Promise<string> {
  const bytes = new TextEncoder().encode(codigo);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}
