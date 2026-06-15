import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import type { AIProvider } from "@/lib/ai-providers";

type AnyProvider = AIProvider | "fal" | "cloudflare";

const VALID_PROVIDERS: AnyProvider[] = ["gemini", "openai", "anthropic", "deepseek", "fal", "cloudflare"];

const KEY_PREFIXES: Record<AnyProvider, string> = {
  gemini: "AIza",
  anthropic: "sk-ant-",
  openai: "sk-",
  deepseek: "sk-",
  fal: "", // Fal.ai keys have no standard prefix
  cloudflare: "", // Cloudflare tokens have no standard prefix
};

/** Valida o token Cloudflare e retorna o account id (auto-detectado). */
async function resolveCloudflareAccount(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

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

  // Cloudflare: valida o token e auto-detecta o account id.
  let cloudflareAccountId: string | null = null;
  if (provider === "cloudflare") {
    cloudflareAccountId = await resolveCloudflareAccount(key);
    if (!cloudflareAccountId) {
      return NextResponse.json(
        { error: "Token Cloudflare inválido ou sem permissão de conta. Verifique o token." },
        { status: 400 }
      );
    }
  }

  const service = createServiceClient();
  const row: {
    user_id: string;
    provider: string;
    access_token: string;
    provider_user_id?: string;
  } = { user_id: user.id, provider, access_token: encryptToken(key) };
  if (cloudflareAccountId) row.provider_user_id = cloudflareAccountId;

  const { error } = await service
    .from("integrations")
    .upsert(row, { onConflict: "user_id,provider" });

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
