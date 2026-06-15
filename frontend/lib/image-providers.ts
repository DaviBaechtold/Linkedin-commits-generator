export type ImageProvider = "cloudflare" | "pollinations" | "dalle" | "fal";

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
  cloudflare: {
    label: "Cloudflare Workers AI (grátis)",
    description: "FLUX schnell — grátis (~dezenas de imagens/dia). Requer token Cloudflare.",
    requiresKey: true,
    integrationProvider: "cloudflare",
    keyLinkLabel: "Criar token em dash.cloudflare.com",
    keyLinkUrl: "https://dash.cloudflare.com/profile/api-tokens",
  },
  pollinations: {
    label: "Pollinations.ai (indisponível)",
    description: "Descontinuado — virou pago. Use Cloudflare (grátis), DALL·E/Fal ou anexe a imagem.",
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

// Lista selecionável na UI — Pollinations fica de fora (descontinuado/pago),
// mas permanece no type/map p/ compatibilidade com valores já salvos.
export const IMAGE_PROVIDER_LIST: ImageProvider[] = ["cloudflare", "dalle", "fal"];
