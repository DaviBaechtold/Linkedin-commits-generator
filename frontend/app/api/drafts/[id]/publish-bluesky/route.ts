import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";

export const maxDuration = 30;

function truncateForBluesky(text: string): string {
  // Bluesky allows 300 graphemes; we leave a small buffer
  const MAX = 290;
  if ([...text].length <= MAX) return text;
  const chars = [...text];
  let cut = chars.slice(0, MAX - 1).join("");
  // Trim at last whitespace to avoid cutting mid-word
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > MAX * 0.7) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + "…";
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const [draftResult, bskyIntegration] = await Promise.all([
    service
      .from("drafts")
      .select("post_text")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    service
      .from("integrations")
      .select("access_token,provider_username")
      .eq("user_id", user.id)
      .eq("provider", "bluesky")
      .maybeSingle(),
  ]);

  if (draftResult.error || !draftResult.data) {
    return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
  }

  if (!bskyIntegration.data) {
    return NextResponse.json(
      { error: "Bluesky não conectado. Configure em Configurações." },
      { status: 400 }
    );
  }

  const handle = bskyIntegration.data.provider_username!;
  const appPassword = decryptToken(bskyIntegration.data.access_token);
  const postText = truncateForBluesky(draftResult.data.post_text);

  // Authenticate
  const sessionRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });

  if (!sessionRes.ok) {
    return NextResponse.json(
      { error: "Falha ao autenticar no Bluesky. Reconecte em Configurações." },
      { status: 400 }
    );
  }

  const session = await sessionRes.json() as { accessJwt: string; did: string };

  // Create post
  const postRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: postText,
        createdAt: new Date().toISOString(),
      },
    }),
  });

  if (!postRes.ok) {
    const err = await postRes.json().catch(() => ({}));
    const msg = (err as { message?: string }).message ?? "Falha ao publicar no Bluesky.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = await postRes.json() as { uri: string };
  return NextResponse.json({ ok: true, uri: result.uri, truncated: [...draftResult.data.post_text].length > 290 });
}
