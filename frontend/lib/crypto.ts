import crypto from "crypto";

/**
 * Criptografia de tokens em repouso (AES-256-GCM).
 *
 * Os tokens de OAuth (GitHub, LinkedIn) e as chaves de IA (BYOK) ficam em
 * `integrations.access_token`. Antes ficavam em texto puro — agora são cifrados
 * no nível da aplicação antes de tocar o banco.
 *
 * Formato armazenado: `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 *
 * Compatibilidade: valores legados (sem o prefixo `v1:`) são tratados como
 * plaintext e retornados como estão na descriptografia — assim os registros
 * antigos seguem funcionando até serem reescritos (migração transparente,
 * sem downtime).
 */

const PREFIX = "v1";
const ALGO = "aes-256-gcm";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY não configurada. Gere com `openssl rand -hex 32`."
    );
  }

  // Aceita 64 hex chars (32 bytes) ou qualquer string (derivada via SHA-256).
  const key =
    /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, "hex")
      : crypto.createHash("sha256").update(raw).digest();

  cachedKey = key;
  return key;
}

/** Cifra um token. Retorna a string no formato `v1:iv:tag:ct`. */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

/**
 * Decifra um token. Se o valor não tiver o prefixo `v1:`, é tratado como
 * legado (plaintext) e devolvido como está.
 */
export function decryptToken(stored: string | null | undefined): string {
  if (!stored) return "";

  if (!stored.startsWith(`${PREFIX}:`)) {
    // Token legado em plaintext — passthrough.
    return stored;
  }

  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new Error("Formato de token cifrado inválido.");
  }

  const [, ivHex, tagHex, ctHex] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

/** True se o valor já está cifrado (tem prefixo `v1:`). */
export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(`${PREFIX}:`);
}

/**
 * Garante que um valor esteja cifrado. Se já tiver o prefixo `v1:`, devolve
 * como está; se for legado (plaintext), cifra. Usado na migração one-shot de
 * re-cifragem de tokens antigos.
 */
export function ensureEncrypted(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return isEncrypted(stored) ? stored : encryptToken(stored);
}

/**
 * Comparação de strings em tempo constante (resistente a timing attacks).
 * Usada para validar segredos como o `CRON_SECRET`.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Valida o header `Authorization: Bearer <CRON_SECRET>` de forma timing-safe. */
export function isValidCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return safeEqual(authHeader.slice("Bearer ".length), secret);
}
