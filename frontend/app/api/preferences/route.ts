import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const VALID_PROVIDERS = ["gemini", "openai", "anthropic", "deepseek"];
  const VALID_IMAGE_PROVIDERS = ["pollinations", "dalle", "fal"];

  const allowed = [
    "post_language",
    "enable_images",
    "image_style",
    "image_provider",
    "commits_since_days",
    "ai_provider",
    "ai_model",
    "profile_instructions",
    "auto_post_enabled",
    "auto_post_frequency",
    "auto_post_hour",
    "auto_post_grace_hours",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Validações
  if (
    update.post_language &&
    !["pt-BR", "en-US", "es"].includes(update.post_language as string)
  ) {
    return NextResponse.json({ error: "Idioma inválido." }, { status: 400 });
  }

  if (update.commits_since_days) {
    const days = Number(update.commits_since_days);
    if (isNaN(days) || days < 1 || days > 90) {
      return NextResponse.json(
        { error: "commits_since_days deve estar entre 1 e 90." },
        { status: 400 }
      );
    }
    update.commits_since_days = days;
  }

  if (update.ai_provider && !VALID_PROVIDERS.includes(update.ai_provider as string)) {
    return NextResponse.json({ error: "Provider de IA inválido." }, { status: 400 });
  }

  if (update.image_provider && !VALID_IMAGE_PROVIDERS.includes(update.image_provider as string)) {
    return NextResponse.json({ error: "Provider de imagem inválido." }, { status: 400 });
  }

  if (update.profile_instructions !== undefined) {
    if (typeof update.profile_instructions !== "string") {
      return NextResponse.json({ error: "profile_instructions inválido." }, { status: 400 });
    }
    if ((update.profile_instructions as string).length > 1000) {
      return NextResponse.json({ error: "Instruções de perfil muito longas (máx. 1000 chars)." }, { status: 400 });
    }
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("user_preferences")
    .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
