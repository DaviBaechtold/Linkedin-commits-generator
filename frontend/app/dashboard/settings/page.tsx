import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [prefsResult, linkedinResult, geminiResult] = await Promise.all([
    supabase.from("user_preferences").select("*").maybeSingle(),
    supabase
      .from("integrations")
      .select("id,provider_username,expires_at")
      .eq("provider", "linkedin")
      .maybeSingle(),
    supabase
      .from("integrations")
      .select("access_token")
      .eq("provider", "gemini")
      .maybeSingle(),
  ]);

  const linkedinData = linkedinResult.data as {
    id: string;
    provider_username: string | null;
    expires_at: string | null;
  } | null;

  const linkedinConnected = !!linkedinData;
  const linkedinExpiry = linkedinData?.expires_at ?? null;
  const linkedinUsername = linkedinData?.provider_username ?? null;

  // Passa apenas os últimos 4 chars da chave — nunca a chave completa para o cliente
  const geminiKey = (geminiResult.data as { access_token: string } | null)?.access_token ?? null;
  const geminiConnected = !!geminiKey;
  const geminiKeyHint = geminiKey ? `...${geminiKey.slice(-4)}` : null;

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
        geminiConnected={geminiConnected}
        geminiKeyHint={geminiKeyHint}
      />
    </div>
  );
}
