import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, logUsage } from "@/lib/rate-limit";
import { regeneratePostText, generateImagePollinations } from "@/lib/gemini";

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
    return NextResponse.json(
      { error: "Limite de regenerações atingido." },
      { status: 429 }
    );
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
      .select("post_language")
      .eq("user_id", user.id)
      .maybeSingle();

    const language = prefs?.post_language ?? "pt-BR";
    const newText = await regeneratePostText(
      draft.raw_log_summary ?? draft.post_text,
      language
    );

    const { data: updated } = await service
      .from("drafts")
      .update({ post_text: newText, status: "pending" })
      .eq("id", id)
      .select()
      .single();

    await logUsage(user.id, "regen_text");
    return NextResponse.json(updated);
  }

  // Regen imagem
  const { data: prefs } = await service
    .from("user_preferences")
    .select("image_style")
    .eq("user_id", user.id)
    .maybeSingle();

  const imageStyle = prefs?.image_style ?? "professional";
  const imageUrl = await generateImagePollinations(
    draft.post_text,
    id,
    imageStyle
  );

  const newAssets = imageUrl
    ? [{ url: imageUrl, mime_type: "image/jpeg" }]
    : draft.visual_assets;

  const { data: updated } = await service
    .from("drafts")
    .update({ visual_assets: newAssets })
    .eq("id", id)
    .select()
    .single();

  await logUsage(user.id, "regen_image");
  return NextResponse.json(updated);
}
