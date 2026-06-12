import { createClient, createServiceClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/SettingsForm";
import { decryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [prefsResult, linkedinResult, aiKeysResult, todayLogs, weekLogs, monthLogs] =
    await Promise.all([
      service.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      service
        .from("integrations")
        .select("id,provider_username,expires_at")
        .eq("user_id", user.id)
        .eq("provider", "linkedin")
        .maybeSingle(),
      service
        .from("integrations")
        .select("provider,access_token")
        .eq("user_id", user.id)
        .in("provider", ["gemini", "openai", "anthropic", "deepseek", "fal"]),
      service
        .from("usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "generate")
        .gte("created_at", todayStart),
      service
        .from("usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "generate")
        .gte("created_at", weekAgo),
      service
        .from("usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "generate")
        .gte("created_at", monthStart),
    ]);

  const linkedinData = linkedinResult.data as {
    id: string;
    provider_username: string | null;
    expires_at: string | null;
  } | null;

  const linkedinConnected = !!linkedinData;
  const linkedinExpiry = linkedinData?.expires_at ?? null;
  const linkedinUsername = linkedinData?.provider_username ?? null;

  const aiKeyHints: Record<string, string | null> = {};
  for (const row of aiKeysResult.data ?? []) {
    const stored = (row as { provider: string; access_token: string }).access_token;
    const provider = (row as { provider: string }).provider;
    // Decifra para mostrar o hint dos últimos 4 chars da chave REAL (não do ciphertext).
    const token = stored ? decryptToken(stored) : "";
    aiKeyHints[provider] = token ? `...${token.slice(-4)}` : null;
  }

  const usageStats = {
    today: todayLogs.count ?? 0,
    week: weekLogs.count ?? 0,
    month: monthLogs.count ?? 0,
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-white/40">
          Gerencie integrações e preferências de geração.
        </p>
      </div>

      <SettingsForm
        preferences={prefsResult.data}
        linkedinConnected={linkedinConnected}
        linkedinExpiry={linkedinExpiry}
        linkedinUsername={linkedinUsername}
        aiKeyHints={aiKeyHints}
        usageStats={usageStats}
      />
    </div>
  );
}
