import { createClient } from "@/lib/supabase/server";
import DraftList from "@/components/DraftList";
import GenerateButton from "@/components/GenerateButton";
import StatsBand, { type Stat } from "@/components/StatsBand";
import SideRail from "@/components/SideRail";
import type { ActivityBucket } from "@/components/ActivityChart";
import type { Draft } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const eightWeeksAgo = new Date(Date.now() - 8 * WEEK_MS).toISOString();

  const head = { count: "exact" as const, head: true };

  const [
    draftsResult,
    postedCount,
    pendingCount,
    scheduledCount,
    monthGenCount,
    activityResult,
    prefsResult,
    linkedinResult,
    reposResult,
    aiResult,
    engagementResult,
  ] = await Promise.all([
    supabase.from("drafts").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("drafts").select("id", head).eq("status", "posted"),
    supabase.from("drafts").select("id", head).eq("status", "pending"),
    supabase.from("drafts").select("id", head).eq("status", "scheduled"),
    supabase
      .from("usage_logs")
      .select("id", head)
      .eq("action", "generate")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("usage_logs")
      .select("created_at")
      .eq("action", "generate")
      .gte("created_at", eightWeeksAgo),
    supabase.from("user_preferences").select("ai_provider,ai_model").maybeSingle(),
    supabase.from("integrations").select("id").eq("provider", "linkedin").maybeSingle(),
    supabase.from("repos").select("id").eq("enabled", true),
    supabase
      .from("integrations")
      .select("id")
      .in("provider", ["gemini", "openai", "anthropic", "deepseek"])
      .limit(1),
    supabase.from("drafts").select("likes_count,comments_count").eq("status", "posted"),
  ]);

  const drafts = (draftsResult.data ?? []) as Draft[];
  const hasLinkedIn = !!linkedinResult.data;
  const hasRepos = (reposResult.data?.length ?? 0) > 0;
  const hasAI = (aiResult.data?.length ?? 0) > 0;

  // Engajamento total (curtidas + comentários dos posts publicados)
  const engRows = (engagementResult.data ?? []) as {
    likes_count: number | null;
    comments_count: number | null;
  }[];
  const totalEngagement = engRows.reduce(
    (s, r) => s + (r.likes_count ?? 0) + (r.comments_count ?? 0),
    0
  );

  // Stats band
  const stats: Stat[] = [
    { key: "posted", label: "Publicados", value: postedCount.count ?? 0, icon: "posted", accent: "#10B981" },
    { key: "pending", label: "Pendentes", value: pendingCount.count ?? 0, icon: "pending", accent: "#F59E0B" },
    { key: "scheduled", label: "Agendados", value: scheduledCount.count ?? 0, icon: "scheduled", accent: "#378FE9" },
    { key: "generated", label: "Gerados no mês", value: monthGenCount.count ?? 0, icon: "generated", accent: "#8B5CF6" },
    { key: "engagement", label: "Engajamento", value: totalEngagement, icon: "engagement", accent: "#EF4444" },
  ];

  // Activity (8 semanas)
  const now = Date.now();
  const weekCounts = new Array(8).fill(0);
  const activityRows = (activityResult.data ?? []) as { created_at: string }[];
  for (const log of activityRows) {
    const weeksAgo = Math.floor((now - new Date(log.created_at).getTime()) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < 8) weekCounts[7 - weeksAgo]++;
  }
  const activity: ActivityBucket[] = weekCounts.map((value, idx) => {
    const d = new Date(now - (7 - idx) * WEEK_MS);
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label, value };
  });

  // Top repos (agregado dos rascunhos carregados)
  const repoFreq = new Map<string, number>();
  for (const d of drafts) {
    for (const r of d.repos_used ?? []) repoFreq.set(r, (repoFreq.get(r) ?? 0) + 1);
  }
  const topRepos = [...repoFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([r]) => r);

  const prefs = prefsResult.data as { ai_model?: string | null; ai_provider?: string | null } | null;
  const activeModel = prefs?.ai_model ?? prefs?.ai_provider ?? null;

  const pendingCt = pendingCount.count ?? 0;
  const needsSetup = !hasLinkedIn || !hasRepos || !hasAI;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-white/40">
            {pendingCt > 0 ? `${pendingCt} aguardando revisão` : "Seus posts e atividade"}
          </p>
        </div>
        <GenerateButton hasLinkedIn={hasLinkedIn} hasRepos={hasRepos} hasAI={hasAI} />
      </div>

      {/* Setup banner */}
      {needsSetup && (
        <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300/80">
          {!hasAI && (
            <p>
              Configure uma{" "}
              <a href="/dashboard/settings" className="underline">chave de API de IA</a>{" "}
              em Configurações para gerar posts.
            </p>
          )}
          {!hasLinkedIn && (
            <p className={!hasAI ? "mt-1" : ""}>
              Conecte seu LinkedIn em{" "}
              <a href="/dashboard/settings" className="underline">Configurações</a>{" "}
              para publicar posts.
            </p>
          )}
          {!hasRepos && (
            <p className={!hasAI || !hasLinkedIn ? "mt-1" : ""}>
              Adicione repositórios em{" "}
              <a href="/dashboard/repos" className="underline">Repositórios</a>{" "}
              para gerar conteúdo.
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <StatsBand stats={stats} />

      {/* Lista + coluna lateral */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DraftList initialDrafts={drafts} />
        <SideRail
          activity={activity}
          topRepos={topRepos}
          activeModel={activeModel}
          bestTime="Ter–Qui, 8h–10h"
        />
      </div>
    </div>
  );
}
