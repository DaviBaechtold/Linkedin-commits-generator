import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AIProvider } from "./ai-providers";

export type { AIProvider };

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

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

function buildUserPrompt(rawLog: string, language: string, profileInstructions?: string): string {
  const profileSection = profileInstructions?.trim()
    ? `\n\nInstruções de perfil do autor:\n${profileInstructions.trim()}`
    : "";

  return `Idioma do post: ${language}${profileSection}

Commits recentes (os nomes de repositórios são aliases, não reais):
${rawLog}

Gere um post profissional para o LinkedIn seguindo todas as regras acima.
Retorne APENAS o texto do post, sem comentários ou markdown adicional.`;
}

async function generateWithGemini(
  rawLog: string,
  language: string,
  apiKey: string,
  model: string,
  profileInstructions?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const userPrompt = buildUserPrompt(rawLog, language, profileInstructions);

  const fallbackModels = [model, "gemini-3.1-flash-lite-preview", "gemini-1.5-flash"];
  const seen = new Set<string>();

  for (const m of fallbackModels) {
    if (seen.has(m)) continue;
    seen.add(m);
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: userPrompt,
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

async function generateWithAnthropic(
  rawLog: string,
  language: string,
  apiKey: string,
  model: string,
  profileInstructions?: string
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const userPrompt = buildUserPrompt(rawLog, language, profileInstructions);

  const message = await client.messages.create({
    model,
    max_tokens: 600,
    system: NDA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    thinking: { type: "adaptive" },
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
    throw new Error("Resposta Claude sem conteúdo de texto.");
  }

  return textBlock.text.trim();
}

async function generateWithOpenAI(
  rawLog: string,
  language: string,
  apiKey: string,
  model: string,
  baseURL?: string,
  profileInstructions?: string
): Promise<string> {
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const userPrompt = buildUserPrompt(rawLog, language, profileInstructions);

  const response = await client.chat.completions.create({
    model,
    max_tokens: 600,
    temperature: 0.85,
    messages: [
      { role: "system", content: NDA_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Resposta vazia do modelo.");
  return text.trim();
}

export async function generatePostText(
  rawLog: string,
  language: string,
  config: AIConfig,
  profileInstructions?: string
): Promise<string> {
  switch (config.provider) {
    case "gemini":
      return generateWithGemini(rawLog, language, config.apiKey, config.model, profileInstructions);
    case "anthropic":
      return generateWithAnthropic(rawLog, language, config.apiKey, config.model, profileInstructions);
    case "openai":
      return generateWithOpenAI(rawLog, language, config.apiKey, config.model, undefined, profileInstructions);
    case "deepseek":
      return generateWithOpenAI(rawLog, language, config.apiKey, config.model, "https://api.deepseek.com", profileInstructions);
    default:
      throw new Error(`Provider desconhecido: ${(config as AIConfig).provider}`);
  }
}
