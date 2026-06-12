import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { api_key } = await request.json();

  if (!api_key || typeof api_key !== "string" || !api_key.trim()) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 400 });
  }

  const key = api_key.trim();

  // Validação de formato mínima — chaves Gemini começam com "AIza"
  if (!key.startsWith("AIza")) {
    return NextResponse.json(
      { error: "Formato inválido. A chave deve começar com 'AIza'." },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { error } = await service.from("integrations").upsert(
    {
      user_id: user.id,
      provider: "gemini",
      access_token: encryptToken(key),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) {
    console.error("Gemini key upsert error:", error);
    return NextResponse.json({ error: "Falha ao salvar chave." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  await service
    .from("integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "gemini");

  return NextResponse.json({ ok: true });
}
