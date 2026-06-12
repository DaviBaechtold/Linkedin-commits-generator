export type ImageProvider = "pollinations" | "dalle" | "fal";

export interface ImageProviderInfo {
  label: string;
  description: string;
  requiresKey: boolean;
  integrationProvider?: string; // key stored under this provider in integrations
  keyPlaceholder?: string;
  keyLinkLabel?: string;
  keyLinkUrl?: string;
}

export const IMAGE_PROVIDERS: Record<ImageProvider, ImageProviderInfo> = {
  pollinations: {
    label: "Pollinations.ai",
    description: "Gratuito, sem chave necessária",
    requiresKey: false,
  },
  dalle: {
    label: "DALL-E 3 (OpenAI)",
    description: "Usa sua chave OpenAI já configurada",
    requiresKey: true,
    integrationProvider: "openai",
    keyLinkLabel: "Configurar chave OpenAI",
    keyLinkUrl: "#ai-keys",
  },
  fal: {
    label: "Fal.ai FLUX",
    description: "Modelos FLUX — URLs permanentes",
    requiresKey: true,
    integrationProvider: "fal",
    keyPlaceholder: "xxxxxxxxxxxxxxxx:...",
    keyLinkLabel: "Obter chave em fal.ai",
    keyLinkUrl: "https://fal.ai/dashboard/keys",
  },
};

export const IMAGE_PROVIDER_LIST = Object.keys(IMAGE_PROVIDERS) as ImageProvider[];
