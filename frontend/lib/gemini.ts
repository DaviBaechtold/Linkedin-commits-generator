import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";

const NDA_SYSTEM_PROMPT = `Você é um especialista em marketing de conteúdo para desenvolvedores no LinkedIn.
Gere posts profissionais e autênticos a partir de commits de código.

REGRAS INEGOCIÁVEIS (filtro NDA):
1. NUNCA mencione nomes reais de empresas, clientes ou projetos
2. NUNCA mencione nomes de ferramentas proprietárias, sistemas internos ou bases de dados específicas
3. NUNCA inclua trechos de código, variáveis, nomes de funções ou arquivos
4. NUNCA revele detalhes de arquitetura, infraestrutura ou regras de negócio
5. NUNCA mencione nomes de colegas, superiores ou clientes
6. Se algum commit sugerir conteúdo confidencial, abstraia para o conceito geral

DIRETRIZES DE ESTILO:
- Tom: profissional mas humano, não corporativo
- Tamanho: 150-300 palavras
- Estrutura: contexto → o que foi construído/resolvido → aprendizado ou insight
- Use emojis com moderação (2-4 no máximo)
- Inclua 3-5 hashtags relevantes ao final
- Escreva no idioma especificado`;

function buildPrompt(rawLog: string, language: string): string {
  return `Idioma do post: ${language}

Commits recentes (os nomes de repositórios são aliases, não reais):
${rawLog}

Gere um post profissional para o LinkedIn seguindo todas as regras acima.
Retorne APENAS o texto do post, sem comentários ou markdown adicional.`;
}

function buildImagePrompt(postText: string, style: string): string {
  const styleMap: Record<string, string> = {
    professional:
      "professional minimal flat design, clean backgrounds, tech aesthetic, blues and grays",
    tech: "dark theme, glowing elements, code-inspired, cyberpunk subtle, neon accents",
    minimal: "ultra minimal, white space, single accent color, elegant typography",
    colorful: "vibrant gradient, energetic, modern, playful yet professional",
  };

  const styleDesc = styleMap[style] ?? styleMap.professional;
  return `Abstract visualization of software development and engineering progress. ${styleDesc}. Square format 1080x1080. No text, no code, no people. Suitable for LinkedIn post illustration.`;
}

/** Gera texto do post usando a chave Gemini do próprio usuário */
export async function generatePostText(
  rawLog: string,
  language: string,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const models = [
    GEMINI_MODEL,
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash-lite-preview-06-17",
    "gemini-1.5-flash",
  ];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildPrompt(rawLog, language),
        config: {
          systemInstruction: NDA_SYSTEM_PROMPT,
          temperature: 0.85,
          maxOutputTokens: 600,
        },
      });

      const text = response.text ?? "";
      if (text.trim()) return text.trim();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 503) continue;
      throw err;
    }
  }

  throw new Error("Todos os modelos Gemini falharam ou quota esgotada.");
}

/** Regenera texto a partir do log summary já armazenado */
export async function regeneratePostText(
  rawLogSummary: string,
  language: string,
  apiKey: string
): Promise<string> {
  return generatePostText(rawLogSummary, language, apiKey);
}

/** Gera imagem via Pollinations.ai (gratuito, sem key) */
export async function generateImagePollinations(
  postText: string,
  draftId: string,
  style: string
): Promise<string | null> {
  const prompt = buildImagePrompt(postText, style);
  const seed = parseInt(draftId.replace(/\D/g, "").slice(0, 8)) || 42;

  const url = new URL("https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt));
  url.searchParams.set("width", "1080");
  url.searchParams.set("height", "1080");
  url.searchParams.set("seed", String(seed));
  url.searchParams.set("nologo", "true");

  try {
    const res = await fetch(url.toString(), { method: "HEAD" });
    if (res.ok) return url.toString();
  } catch {
    // Imagem é opcional — falha silenciosa
  }

  return null;
}
