import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";
import type { AIProvider } from "@/lib/ai-providers";

export const maxDuration = 30;

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

/** Tenta auto-detectar o account id (só funciona se o token tiver permissão de listar contas). */
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

/** Valida token+account fazendo uma geração FLUX real (definitivo). */
async function validateCloudflare(token: string, accountId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test", steps: 4 }),
      }
    );
    return res.ok;
  } catch {
    return false;
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

  const body = await request.json();
  const api_key = body.api_key;
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

  // Cloudflare: usa o account id informado (ou tenta auto-detectar) e valida.
  let cloudflareAccountId: string | null = null;
  if (provider === "cloudflare") {
    const provided =
      typeof body.account_id === "string" ? body.account_id.trim() : "";
    cloudflareAccountId = provided || (await resolveCloudflareAccount(key));
    if (!cloudflareAccountId) {
      return NextResponse.json(
        {
          error:
            "Informe o Account ID da Cloudflare (esse tipo de token não permite detectá-lo automaticamente).",
        },
        { status: 400 }
      );
    }
    const valid = await validateCloudflare(key, cloudflareAccountId);
    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Token ou Account ID inválido, ou o token não tem permissão Workers AI. Confira ambos.",
        },
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
