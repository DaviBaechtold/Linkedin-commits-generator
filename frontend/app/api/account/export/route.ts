import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Portabilidade de dados (LGPD, art. 18, V). Devolve um JSON com todos os
 * dados pessoais do usuário autenticado. Tokens e chaves de API NÃO são
 * exportados (apenas o metadado de quais provedores estão conectados).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const [integrations, repos, drafts, preferences, usageLogs] = await Promise.all([
    service
      .from("integrations")
      .select("provider,provider_username,expires_at,created_at,updated_at")
      .eq("user_id", user.id),
    service.from("repos").select("*").eq("user_id", user.id),
    service.from("drafts").select("*").eq("user_id", user.id),
    service.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    service
      .from("usage_logs")
      .select("action,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const payload = {
    export_format: "commitpost.account-export.v1",
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at ?? null,
    },
    // Apenas metadados — chaves/tokens nunca são exportados.
    integrations: integrations.data ?? [],
    repos: repos.data ?? [],
    drafts: drafts.data ?? [],
    preferences: preferences.data ?? null,
    usage_logs: usageLogs.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="commitpost-dados-${user.id}.json"`,
    },
  });
}
