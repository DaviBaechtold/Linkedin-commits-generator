import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, logUsage } from "@/lib/rate-limit";
import { generatePostText, type AIConfig } from "@/lib/ai";
import { generateImage, type ImageConfig } from "@/lib/image";
import { getDefaultModel, type AIProvider } from "@/lib/ai-providers";
import type { ImageProvider } from "@/lib/image-providers";
import { decryptToken } from "@/lib/crypto";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const type: "text" | "image" = body.type ?? "text";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = type === "text" ? "regen_text" : "regen_image";
  const { allowed } = await checkRateLimit(user.id, action);
  if (!allowed) {
    return NextResponse.json({ error: "Limite de regenerações atingido." }, { status: 429 });
  }

  const service = createServiceClient();

  const { data: draft, error: fetchError } = await service
    .from("drafts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !draft) {
    return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
  }

  if (type === "text") {
    const { data: prefs } = await service
      .from("user_preferences")
      .select("post_language,ai_provider,ai_model,profile_instructions")
      .eq("user_id", user.id)
      .maybeSingle();

    const aiProvider = ((prefs?.ai_provider as AIProvider) ?? "gemini") as AIProvider;
    const aiModel = (prefs?.ai_model as string) ?? getDefaultModel(aiProvider);
    const profileInstructions = (prefs?.profile_instructions as string | undefined) ?? undefined;
    const language = prefs?.post_language ?? "pt-BR";

    const { data: aiIntegration } = await service
      .from("integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", aiProvider)
      .maybeSingle();

    const aiApiKey = aiIntegration?.access_token
      ? decryptToken(aiIntegration.access_token)
      : undefined;
    if (!aiApiKey) {
      return NextResponse.json(
        { error: `Chave de API ${aiProvider} não configurada.` },
        { status: 400 }
      );
    }

    const aiConfig: AIConfig = { provider: aiProvider, model: aiModel, apiKey: aiApiKey };

    const newText = await generatePostText(
      draft.raw_log_summary ?? draft.post_text,
      language,
      aiConfig,
      profileInstructions
    );

    const { data: updated } = await service
      .from("drafts")
      .update({ post_text: newText, status: "pending" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    await logUsage(user.id, "regen_text");
    return NextResponse.json(updated);
  }

  // Regen imagem
  const { data: prefs } = await service
    .from("user_preferences")
    .select("image_style,image_provider")
    .eq("user_id", user.id)
    .maybeSingle();

  const imageStyle = prefs?.image_style ?? "professional";
  const imageProvider = ((prefs?.image_provider as ImageProvider) ?? "pollinations") as ImageProvider;

  let imageApiKey: string | undefined;
  if (imageProvider === "dalle") {
    const { data } = await service
      .from("integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "openai")
      .maybeSingle();
    imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
  } else if (imageProvider === "fal") {
    const { data } = await service
      .from("integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "fal")
      .maybeSingle();
    imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
  }

  // Seed aleatório → "Nova imagem" gera uma imagem DIFERENTE a cada clique.
  const imageConfig: ImageConfig = {
    provider: imageProvider,
    apiKey: imageApiKey,
    seed: Math.floor(Math.random() * 100_000_000),
  };
  const imageUrl = await generateImage(draft.post_text, id, imageStyle, imageConfig);

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Falha ao gerar imagem. Tente novamente." },
      { status: 502 }
    );
  }

  const { data: updated } = await service
    .from("drafts")
    .update({ visual_assets: [{ url: imageUrl, mime_type: "image/jpeg" }] })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  await logUsage(user.id, "regen_image");
  return NextResponse.json(updated);
}
