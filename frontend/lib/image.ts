import type { ImageProvider } from "./image-providers";

export interface ImageConfig {
  provider: ImageProvider;
  apiKey?: string;
  /** Seed opcional p/ variar a imagem (ex.: regenerar gera uma diferente). */
  seed?: number;
}

function buildImagePrompt(postText: string, style: string): string {
  const styleMap: Record<string, string> = {
    professional: "professional minimal flat design, clean backgrounds, tech aesthetic, blues and grays",
    tech: "dark theme, glowing elements, code-inspired, cyberpunk subtle, neon accents",
    minimal: "ultra minimal, white space, single accent color, elegant typography",
    colorful: "vibrant gradient, energetic, modern, playful yet professional",
  };
  const styleDesc = styleMap[style] ?? styleMap.professional;
  return `Abstract visualization of software development and engineering progress. ${styleDesc}. Square format 1080x1080. No text, no code, no people. Suitable for LinkedIn post illustration.`;
}

function generateWithPollinations(): null {
  // Pollinations.ai monetizou (protocolo x402): o tier gratuito anônimo retorna
  // HTTP 402 e não serve mais imagens. Desativado — retorna null para não gravar
  // URLs quebradas. Usuários anexam a própria imagem (upload) ou usam DALL·E/Fal
  // com chave BYOK. Mantido o stub para compatibilidade do switch de provider.
  return null;
}

async function generateWithDalle(
  postText: string,
  apiKey: string,
  style: string
): Promise<string | null> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const prompt = buildImagePrompt(postText, style);
  try {
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });
    return response.data?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

async function generateWithFal(
  postText: string,
  apiKey: string,
  style: string
): Promise<string | null> {
  const prompt = buildImagePrompt(postText, style);
  try {
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "square_hd",
        num_images: 1,
        sync_mode: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.images?.[0]?.url as string) ?? null;
  } catch {
    return null;
  }
}

export async function generateImage(
  postText: string,
  draftId: string,
  style: string,
  config: ImageConfig
): Promise<string | null> {
  switch (config.provider) {
    case "dalle":
      if (!config.apiKey) return generateWithPollinations();
      return generateWithDalle(postText, config.apiKey, style);
    case "fal":
      if (!config.apiKey) return generateWithPollinations();
      return generateWithFal(postText, config.apiKey, style);
    default:
      return generateWithPollinations();
  }
}
