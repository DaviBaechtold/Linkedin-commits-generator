export type AIProvider =
  | "gemini"
  | "anthropic"
  | "openai"
  | "deepseek"
  | "groq"
  | "mistral"
  | "xai";

export interface ModelInfo {
  id: string;
  label: string;
}

export interface ProviderInfo {
  label: string;
  keyPlaceholder: string;
  keyLinkLabel: string;
  keyLinkUrl: string;
  models: ModelInfo[];
}

export const PROVIDERS: Record<AIProvider, ProviderInfo> = {
  gemini: {
    label: "Google Gemini",
    keyPlaceholder: "AIzaSy...",
    keyLinkLabel: "Obter no AI Studio",
    keyLinkUrl: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite (grátis)" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  anthropic: {
    label: "Anthropic Claude",
    keyPlaceholder: "sk-ant-...",
    keyLinkLabel: "Obter no Claude Console",
    keyLinkUrl: "https://console.anthropic.com/",
    models: [
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (rápido)" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 (mais capaz)" },
    ],
  },
  openai: {
    label: "OpenAI",
    keyPlaceholder: "sk-...",
    keyLinkLabel: "Obter na OpenAI Platform",
    keyLinkUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini (rápido)" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    ],
  },
  deepseek: {
    label: "DeepSeek",
    keyPlaceholder: "sk-...",
    keyLinkLabel: "Obter no DeepSeek Platform",
    keyLinkUrl: "https://platform.deepseek.com/",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat (padrão)" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  groq: {
    label: "Groq",
    keyPlaceholder: "gsk_...",
    keyLinkLabel: "Obter no Groq Console",
    keyLinkUrl: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (grátis, rápido)" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (ultra-rápido)" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  mistral: {
    label: "Mistral AI",
    keyPlaceholder: "...",
    keyLinkLabel: "Obter na Mistral Console",
    keyLinkUrl: "https://console.mistral.ai/api-keys/",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small (rápido)" },
      { id: "mistral-large-latest", label: "Mistral Large (mais capaz)" },
      { id: "open-mistral-nemo", label: "Mistral Nemo (grátis)" },
    ],
  },
  xai: {
    label: "xAI Grok",
    keyPlaceholder: "xai-...",
    keyLinkLabel: "Obter no xAI Console",
    keyLinkUrl: "https://console.x.ai/",
    models: [
      { id: "grok-3-mini", label: "Grok 3 Mini (rápido)" },
      { id: "grok-3", label: "Grok 3" },
    ],
  },
};

export const AI_PROVIDERS = Object.keys(PROVIDERS) as AIProvider[];

export function getDefaultModel(provider: AIProvider): string {
  return PROVIDERS[provider].models[0].id;
}

export type ToneStyle = "balanced" | "technical" | "storytelling" | "achievement" | "reflection";

export const TONE_OPTIONS: { id: ToneStyle; label: string; desc: string }[] = [
  { id: "balanced",     label: "Equilibrado",  desc: "Tom neutro e profissional (padrão)" },
  { id: "technical",    label: "Técnico",       desc: "Foco em arquitetura e engenharia" },
  { id: "storytelling", label: "Narrativo",     desc: "História com contexto e resolução" },
  { id: "achievement",  label: "Conquista",     desc: "Celebra marcos e resultados" },
  { id: "reflection",   label: "Reflexivo",     desc: "Compartilha aprendizados e erros" },
];
