import { createClient } from "@/lib/supabase/server";
import RepoManager from "@/components/RepoManager";
import type { Repo } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ReposPage() {
  const supabase = await createClient();

  const { data: repos } = await supabase
    .from("repos")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: ghIntegrationRaw } = await supabase
    .from("integrations")
    .select("provider_username")
    .eq("provider", "github")
    .maybeSingle();

  const ghIntegration = ghIntegrationRaw as { provider_username: string | null } | null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Repositórios</h1>
        <p className="mt-1 text-sm text-white/40">
          Gerencie os repositórios usados para gerar posts.
        </p>
      </div>

      <RepoManager
        initialRepos={(repos ?? []) as Repo[]}
        githubUsername={ghIntegration?.provider_username ?? null}
      />
    </div>
  );
}
