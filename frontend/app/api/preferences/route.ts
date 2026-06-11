import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const allowed = [
    "post_language",
    "enable_images",
    "image_style",
    "commits_since_days",
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

  const service = createServiceClient();
  const { data, error } = await service
    .from("user_preferences")
    .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
