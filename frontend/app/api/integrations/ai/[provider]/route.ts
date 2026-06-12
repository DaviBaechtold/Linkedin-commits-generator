import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import type { AIProvider } from "@/lib/ai-providers";

type AnyProvider = AIProvider | "fal";

const VALID_PROVIDERS: AnyProvider[] = ["gemini", "openai", "anthropic", "deepseek", "fal"];

const KEY_PREFIXES: Record<AnyProvider, string> = {
  gemini: "AIza",
  anthropic: "sk-ant-",
  openai: "sk-",
  deepseek: "sk-",
  fal: "", // Fal.ai keys have no standard prefix
};

type RouteContext = { params: Promise<{ provider: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { provider } = await params;

  if (!VALID_PROVIDERS.includes(provider as AnyProvider)) {
    return NextResponse.json({ error: "Provider inválido." }, { status: 400 });
  }

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
  const prefix = KEY_PREFIXES[provider as AnyProvider];
  if (prefix && !key.startsWith(prefix)) {
    return NextResponse.json(
      { error: `Formato inválido. Chaves ${provider} começam com '${prefix}'.` },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { error } = await service
    .from("integrations")
    .upsert(
      { user_id: user.id, provider, access_token: encryptToken(key) },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    console.error("AI key upsert error:", error);
    return NextResponse.json({ error: "Falha ao salvar chave." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { provider } = await params;

  if (!VALID_PROVIDERS.includes(provider as AnyProvider)) {
    return NextResponse.json({ error: "Provider inválido." }, { status: 400 });
  }

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
    .eq("provider", provider);

  return NextResponse.json({ ok: true });
}
