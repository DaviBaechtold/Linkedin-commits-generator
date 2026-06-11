import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, logUsage } from "@/lib/rate-limit";
import { fetchCommits, formatCommitsForPrompt, type GitHubCommit } from "@/lib/github";
import { generatePostText, generateImagePollinations } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const { allowed, remaining } = await checkRateLimit(user.id, "generate");
  if (!allowed) {
    return NextResponse.json(
      { error: `Limite diário de gerações atingido. Tente amanhã.` },
      { status: 429 }
    );
  }

  const service = createServiceClient();

  // Carrega repos ativos + prefs + integrações em paralelo
  const [reposResult, prefsResult, ghIntegration, geminiIntegration] = await Promise.all([
    service
      .from("repos")
      .select("*")
      .eq("user_id", user.id)
      .eq("enabled", true),
    service
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    service
      .from("integrations")
      .select("access_token,provider_username")
      .eq("user_id", user.id)
      .eq("provider", "github")
      .maybeSingle(),
    service
      .from("integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("provider", "gemini")
      .maybeSingle(),
  ]);

  const repos = reposResult.data ?? [];
  if (repos.length === 0) {
    return NextResponse.json(
      { error: "Nenhum repositório ativo. Adicione repos primeiro." },
      { status: 400 }
    );
  }

  const geminiApiKey = geminiIntegration?.data?.access_token;
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Chave Gemini não configurada. Adicione sua API Key em Configurações." },
      { status: 400 }
    );
  }

  const prefs = prefsResult.data;
  const language = prefs?.post_language ?? "pt-BR";
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - (prefs?.commits_since_days ?? 30));
  const enableImages = prefs?.enable_images ?? true;
  const imageStyle = prefs?.image_style ?? "professional";

  // Busca commits — GitHub API ou skip se repo sem github_full_name
  let allCommits: GitHubCommit[] = [];

  if (ghIntegration?.data?.access_token) {
    const token = ghIntegration.data.access_token;
    const login = ghIntegration.data.provider_username ?? undefined;

    const commitArrays = await Promise.all(
      repos
        .filter((r) => r.github_full_name)
        .map((r) =>
          fetchCommits(token, r.github_full_name!, r.alias, sinceDate, login)
        )
    );
    allCommits = commitArrays.flat();
  }

  // Se não tem commits do GitHub, usa repos sem github_full_name como stub
  const rawLogSummary =
    allCommits.length > 0
      ? formatCommitsForPrompt(allCommits)
      : repos.map((r) => `[${r.alias}] Atividade recente de desenvolvimento`).join("\n");

  if (!rawLogSummary.trim()) {
    return NextResponse.json(
      { error: "Nenhum commit encontrado no período configurado." },
      { status: 400 }
    );
  }

  // Gera post com Gemini
  let postText: string;
  try {
    postText = await generatePostText(rawLogSummary, language, geminiApiKey);
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { error: "Falha ao gerar texto com IA. Tente novamente." },
      { status: 500 }
    );
  }

  // Gera imagem (opcional, não bloqueia)
  const draftId = Date.now().toString();
  let visualAssets: { url: string; mime_type: string }[] = [];

  if (enableImages) {
    const imageUrl = await generateImagePollinations(postText, draftId, imageStyle);
    if (imageUrl) {
      visualAssets = [{ url: imageUrl, mime_type: "image/jpeg" }];
    }
  }

  // Persiste rascunho
  const { data: draft, error: insertError } = await service
    .from("drafts")
    .insert({
      user_id: user.id,
      post_text: postText,
      raw_log_summary: rawLogSummary,
      visual_assets: visualAssets,
      status: "pending",
      repos_used: repos.map((r) => r.alias),
      model_used: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview",
    })
    .select()
    .single();

  if (insertError || !draft) {
    console.error("Insert draft error:", insertError);
    return NextResponse.json(
      { error: "Falha ao salvar rascunho." },
      { status: 500 }
    );
  }

  await logUsage(user.id, "generate");

  return NextResponse.json({ draft, remaining: remaining - 1 });
}
