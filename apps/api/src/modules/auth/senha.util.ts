// Hash de senha via PBKDF2 (Web Crypto nativo do runtime de Workers — regra 1 do
// documento de convenções: hashing forte obrigatório, nunca texto puro). Não depende de
// nenhuma lib externa, o que evita problemas de compatibilidade com o runtime de
// Workers que libs como bcrypt/argon2 costumam ter.

const ITERACOES = 210_000; // recomendação OWASP (2024+) para PBKDF2-SHA256
const TAMANHO_SALT_BYTES = 16;
const TAMANHO_HASH_BITS = 256;

async function derivarChave(senha: string, salt: Uint8Array, iteracoes: number): Promise<ArrayBuffer> {
  const chaveBase = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, [
    "deriveBits",
  ]);

  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iteracoes },
    chaveBase,
    TAMANHO_HASH_BITS
  );
}

function paraBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function deBase64(valor: string): Uint8Array {
  return Uint8Array.from(atob(valor), (c) => c.charCodeAt(0));
}

/** Gera o hash no formato `iteracoes:saltBase64:hashBase64`, pronto para salvar em `senha_hash`. */
export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(TAMANHO_SALT_BYTES));
  const hash = await derivarChave(senha, salt, ITERACOES);
  return `${ITERACOES}:${paraBase64(salt)}:${paraBase64(hash)}`;
}

/** Verifica uma senha em texto puro contra um hash gerado por `gerarHashSenha`. */
export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  const partes = hashArmazenado.split(":");
  if (partes.length !== 3) return false;

  const [iteracoesTexto, saltBase64, hashBase64] = partes as [string, string, string];
  const iteracoes = Number(iteracoesTexto);
  if (!Number.isInteger(iteracoes) || iteracoes <= 0) return false;

  const salt = deBase64(saltBase64);
  const hashEsperado = deBase64(hashBase64);
  const hashCalculado = new Uint8Array(await derivarChave(senha, salt, iteracoes));

  if (hashCalculado.length !== hashEsperado.length) return false;

  // Comparação em tempo constante para não vazar, via timing, quantos bytes coincidem.
  let diferenca = 0;
  for (let i = 0; i < hashCalculado.length; i++) {
    diferenca |= (hashCalculado[i] as number) ^ (hashEsperado[i] as number);
  }
  return diferenca === 0;
}
