import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { listUserRepos } from "@/lib/github";
import { decryptToken } from "@/lib/crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: integration } = await service
    .from("integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  if (!integration?.access_token) {
    return NextResponse.json(
      { error: "GitHub não conectado." },
      { status: 400 }
    );
  }

  try {
    const repos = await listUserRepos(decryptToken(integration.access_token));
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json(
      { error: "Falha ao listar repos do GitHub." },
      { status: 502 }
    );
  }
}
