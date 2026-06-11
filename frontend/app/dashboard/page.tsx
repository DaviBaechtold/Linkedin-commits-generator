import { createClient } from "@/lib/supabase/server";
import DraftList from "@/components/DraftList";
import GenerateButton from "@/components/GenerateButton";
import type { Draft } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [draftsResult, linkedinResult, reposResult, geminiResult] = await Promise.all([
    supabase
      .from("drafts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("integrations")
      .select("id,expires_at")
      .eq("provider", "linkedin")
      .maybeSingle(),
    supabase
      .from("repos")
      .select("id")
      .eq("enabled", true),
    supabase
      .from("integrations")
      .select("id")
      .eq("provider", "gemini")
      .maybeSingle(),
  ]);

  const drafts = (draftsResult.data ?? []) as Draft[];
  const hasLinkedIn = !!linkedinResult.data;
  const hasRepos = (reposResult.data?.length ?? 0) > 0;
  const hasGemini = !!geminiResult.data;

  const pendingCount = drafts.filter((d) => d.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Rascunhos</h1>
          {pendingCount > 0 && (
            <p className="mt-0.5 text-sm text-white/40">
              {pendingCount} aguardando revisão
            </p>
          )}
        </div>
        <GenerateButton
          hasLinkedIn={hasLinkedIn}
          hasRepos={hasRepos}
          hasGemini={hasGemini}
        />
      </div>

      {/* Onboarding incompleto */}
      {(!hasLinkedIn || !hasRepos || !hasGemini) && (
        <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300/80">
          {!hasGemini && (
            <p>
              Configure sua{" "}
              <a href="/dashboard/settings" className="underline">
                Gemini API Key
              </a>{" "}
              para gerar posts com IA.
            </p>
          )}
          {!hasLinkedIn && (
            <p className={!hasGemini ? "mt-1" : ""}>
              Conecte seu LinkedIn em{" "}
              <a href="/dashboard/settings" className="underline">
                Configurações
              </a>{" "}
              para publicar posts.
            </p>
          )}
          {!hasRepos && (
            <p className={!hasGemini || !hasLinkedIn ? "mt-1" : ""}>
              Adicione repositórios em{" "}
              <a href="/dashboard/repos" className="underline">
                Repositórios
              </a>{" "}
              para gerar conteúdo.
            </p>
          )}
        </div>
      )}

      <DraftList initialDrafts={drafts} />
    </div>
  );
}
