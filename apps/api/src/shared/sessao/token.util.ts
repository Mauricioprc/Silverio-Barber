/**
 * Geração de token opaco de sessão — usada por `sessao.util.ts` (sócio) e
 * `sessao-cliente.util.ts` (cliente), por isso vive aqui em vez de duplicada em cada um.
 */
export function gerarTokenOpaco(): string {
  // 256 bits, aleatório e criptograficamente seguro (Web Crypto — nativo do runtime de
  // Workers), codificado em base64url para uso direto como valor de cookie.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
