import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/crypto";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const handle = String(body.handle ?? "").trim().replace(/^@/, "");
  const appPassword = String(body.app_password ?? "").trim();

  if (!handle || !appPassword) {
    return NextResponse.json({ error: "Handle e app password obrigatórios." }, { status: 400 });
  }

  // Validate credentials by creating a session
  const sessionRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });

  if (!sessionRes.ok) {
    const err = await sessionRes.json().catch(() => ({}));
    const msg = (err as { message?: string }).message ?? "Credenciais inválidas.";
    return NextResponse.json({ error: `Bluesky: ${msg}` }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("integrations").upsert(
    {
      user_id: user.id,
      provider: "bluesky",
      access_token: encryptToken(appPassword),
      provider_username: handle,
    },
    { onConflict: "user_id,provider" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
    .eq("provider", "bluesky");

  return NextResponse.json({ ok: true });
}
