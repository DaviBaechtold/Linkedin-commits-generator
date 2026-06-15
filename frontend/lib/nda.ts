/**
 * Filtro NDA determinístico — rede de segurança independente do LLM.
 *
 * O prompt já instrui o modelo a não vazar dados sensíveis, mas isso é
 * best-effort. Este módulo aplica regras determinísticas (regex) em duas pontas:
 *
 *  1. No log de commits ANTES de enviar à IA — impede que segredos cheguem
 *     sequer ao provedor de IA (defesa em profundidade).
 *  2. No texto gerado pela IA, antes de salvar/publicar — última barreira.
 */

const REDACTION = "[redigido]";

// Padrões de segredos/credenciais conhecidos — nunca devem vazar.
const SECRET_PATTERNS: RegExp[] = [
  /\bsk-ant-[A-Za-z0-9_-]{10,}\b/g, // Anthropic
  /\bsk-[A-Za-z0-9]{20,}\b/g, // OpenAI / DeepSeek
  /\bAIza[A-Za-z0-9_-]{30,}\b/g, // Google / Gemini
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, // GitHub fine-grained PAT
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, // Slack
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
  /-----BEGIN[A-Z ]+PRIVATE KEY-----[\s\S]+?-----END[A-Z ]+PRIVATE KEY-----/g, // PEM
];

// E-mails.
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// URLs com credenciais embutidas (user:pass@host).
const URL_CREDS_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]+@/gi;

// Hashes/blobs longos hex (≥32) — costumam ser hashes, IDs internos ou chaves.
const LONG_HEX_PATTERN = /\b[0-9a-fA-F]{32,}\b/g;

/**
 * Remove segredos e dados sensíveis de um texto livre.
 * Aplicado ao log de commits antes da IA e ao texto final.
 */
export function sanitizeForNDA(text: string): string {
  if (!text) return text;

  let out = text;

  // 1. Credenciais em URLs — substitui só a parte user:pass@
  out = out.replace(URL_CREDS_PATTERN, (m) => {
    const scheme = m.slice(0, m.indexOf("://") + 3);
    return `${scheme}${REDACTION}@`;
  });

  // 2. Segredos conhecidos
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTION);
  }

  // 3. E-mails
  out = out.replace(EMAIL_PATTERN, REDACTION);

  // 4. Blobs hex longos (preserva SHAs curtos de commit de 7 chars)
  out = out.replace(LONG_HEX_PATTERN, REDACTION);

  return out;
}

/**
 * Aplica regras NDA personalizadas do usuário (palavras/frases separadas por
 * newline ou vírgula). Chamado ANTES de enviar à IA e DEPOIS de receber o texto.
 */
export function applyCustomNDA(text: string, rules: string | null | undefined): string {
  if (!text || !rules?.trim()) return text;
  const words = rules.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean);
  let out = text;
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), REDACTION);
  }
  return out;
}

/** Extrai hashtags do texto gerado (último parágrafo ou todas as ocorrências). */
export function extractHashtags(text: string): string[] {
  const all = text.match(/#[A-Za-zÀ-ÿ0-9_]+/g) ?? [];
  return [...new Set(all)].slice(0, 10);
}

/**
 * Verifica se um texto ainda contém padrões sensíveis após a sanitização.
 * Útil para logging/alertas sem bloquear a publicação.
 */
export function hasSensitiveContent(text: string): boolean {
  if (!text) return false;
  return (
    SECRET_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return p.test(text);
    }) ||
    EMAIL_PATTERN.test(text)
  );
}
