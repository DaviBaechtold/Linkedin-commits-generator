import { createClient } from "@/lib/supabase/server";
import DraftList from "@/components/DraftList";
import GenerateButton from "@/components/GenerateButton";
import type { Draft } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [draftsResult, linkedinResult, reposResult, aiResult] = await Promise.all([
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
    supabase.from("repos").select("id").eq("enabled", true),
    supabase
      .from("integrations")
      .select("id")
      .in("provider", ["gemini", "openai", "anthropic", "deepseek"])
      .limit(1),
  ]);

  const drafts = (draftsResult.data ?? []) as Draft[];
  const hasLinkedIn = !!linkedinResult.data;
  const hasRepos = (reposResult.data?.length ?? 0) > 0;
  const hasAI = (aiResult.data?.length ?? 0) > 0;

  const pendingCount = drafts.filter((d) => d.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Rascunhos</h1>
          {pendingCount > 0 && (
            <p className="mt-0.5 text-sm text-white/40">
              {pendingCount} aguardando revisão
            </p>
          )}
        </div>
        <GenerateButton hasLinkedIn={hasLinkedIn} hasRepos={hasRepos} hasAI={hasAI} />
      </div>

      {(!hasLinkedIn || !hasRepos || !hasAI) && (
        <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300/80">
          {!hasAI && (
            <p>
              Configure uma{" "}
              <a href="/dashboard/settings" className="underline">
                chave de API de IA
              </a>{" "}
              em Configurações para gerar posts.
            </p>
          )}
          {!hasLinkedIn && (
            <p className={!hasAI ? "mt-1" : ""}>
              Conecte seu LinkedIn em{" "}
              <a href="/dashboard/settings" className="underline">
                Configurações
              </a>{" "}
              para publicar posts.
            </p>
          )}
          {!hasRepos && (
            <p className={!hasAI || !hasLinkedIn ? "mt-1" : ""}>
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
