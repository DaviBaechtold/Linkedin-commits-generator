import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, logUsage } from "@/lib/rate-limit";
import { fetchCommits, formatCommitsForPrompt, type GitHubCommit } from "@/lib/github";
import { generatePostText, type AIConfig } from "@/lib/ai";
import { generateImage, type ImageConfig } from "@/lib/image";
import { getDefaultModel, type AIProvider } from "@/lib/ai-providers";
import type { ImageProvider } from "@/lib/image-providers";
import { decryptToken } from "@/lib/crypto";
import { applyCustomNDA, extractHashtags } from "@/lib/nda";

export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, remaining } = await checkRateLimit(user.id, "generate");
  if (!allowed) {
    return NextResponse.json(
      { error: "Limite diário de gerações atingido. Tente amanhã." },
      { status: 429 }
    );
  }

  const service = createServiceClient();

  const [reposResult, prefsResult, ghIntegration] = await Promise.all([
    service.from("repos").select("*").eq("user_id", user.id).eq("enabled", true),
    service.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    service
      .from("integrations")
      .select("access_token,provider_username")
      .eq("user_id", user.id)
      .eq("provider", "github")
      .maybeSingle(),
  ]);

  const repos = reposResult.data ?? [];
  if (repos.length === 0) {
    return NextResponse.json(
      { error: "Nenhum repositório ativo. Adicione repos primeiro." },
      { status: 400 }
    );
  }

  const prefs = prefsResult.data;
  const aiProvider = ((prefs?.ai_provider as AIProvider) ?? "gemini") as AIProvider;
  const aiModel = (prefs?.ai_model as string) ?? getDefaultModel(aiProvider);
  const profileInstructions = (prefs?.profile_instructions as string | undefined) ?? undefined;
  const toneStyle = (prefs?.tone_style as string | undefined) ?? "balanced";
  const customNdaRules = (prefs?.nda_custom_rules as string | undefined) ?? undefined;
  const language = prefs?.post_language ?? "pt-BR";
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - (prefs?.commits_since_days ?? 30));
  const enableImages = prefs?.enable_images ?? true;
  const imageStyle = prefs?.image_style ?? "professional";
  let imageProvider = ((prefs?.image_provider as ImageProvider) ?? "pollinations") as ImageProvider;

  // Pollinations descontinuado: cai p/ Cloudflare se o usuário já configurou.
  if (imageProvider === "pollinations") {
    const { data: cf } = await service
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "cloudflare")
      .maybeSingle();
    if (cf) imageProvider = "cloudflare";
  }

  const { data: aiIntegration } = await service
    .from("integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", aiProvider)
    .maybeSingle();

  const aiApiKey = aiIntegration?.access_token
    ? decryptToken(aiIntegration.access_token)
    : undefined;
  if (!aiApiKey) {
    return NextResponse.json(
      { error: `Chave de API ${aiProvider} não configurada. Adicione em Configurações.` },
      { status: 400 }
    );
  }

  const aiConfig: AIConfig = { provider: aiProvider, model: aiModel, apiKey: aiApiKey };

  let allCommits: GitHubCommit[] = [];

  if (ghIntegration?.data?.access_token) {
    const token = decryptToken(ghIntegration.data.access_token);
    const login = ghIntegration.data.provider_username ?? undefined;

    const commitArrays = await Promise.all(
      repos
        .filter((r) => r.github_full_name)
        .map((r) => fetchCommits(token, r.github_full_name!, r.alias, sinceDate, login))
    );
    allCommits = commitArrays.flat();
  }

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

  let postText: string;
  try {
    postText = await generatePostText(rawLogSummary, language, aiConfig, profileInstructions, toneStyle);
    postText = applyCustomNDA(postText, customNdaRules ?? null);
  } catch (err) {
    console.error("AI generation error:", err);
    return NextResponse.json(
      { error: "Falha ao gerar texto com IA. Tente novamente." },
      { status: 500 }
    );
  }

  const draftId = Date.now().toString();
  let visualAssets: { url: string; mime_type: string }[] = [];

  if (enableImages) {
    let imageApiKey: string | undefined;
    let imageAccountId: string | undefined;
    if (imageProvider === "dalle") {
      const { data } = await service
        .from("integrations")
        .select("access_token")
        .eq("user_id", user.id)
        .eq("provider", "openai")
        .maybeSingle();
      imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
    } else if (imageProvider === "fal") {
      const { data } = await service
        .from("integrations")
        .select("access_token")
        .eq("user_id", user.id)
        .eq("provider", "fal")
        .maybeSingle();
      imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
    } else if (imageProvider === "cloudflare") {
      const { data } = await service
        .from("integrations")
        .select("access_token,provider_user_id")
        .eq("user_id", user.id)
        .eq("provider", "cloudflare")
        .maybeSingle();
      imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
      imageAccountId = data?.provider_user_id ?? undefined;
    }
    const imageConfig: ImageConfig = {
      provider: imageProvider,
      apiKey: imageApiKey,
      accountId: imageAccountId,
      userId: user.id,
    };
    const imageUrl = await generateImage(postText, draftId, imageStyle, imageConfig);
    if (imageUrl) {
      visualAssets = [{ url: imageUrl, mime_type: "image/jpeg" }];
    }
  }

  const { data: draft, error: insertError } = await service
    .from("drafts")
    .insert({
      user_id: user.id,
      post_text: postText,
      raw_log_summary: rawLogSummary,
      visual_assets: visualAssets,
      status: "pending",
      repos_used: repos.map((r) => r.alias),
      model_used: `${aiProvider}/${aiModel}`,
      hashtags: extractHashtags(postText),
    })
    .select()
    .single();

  if (insertError || !draft) {
    console.error("Insert draft error:", insertError);
    return NextResponse.json({ error: "Falha ao salvar rascunho." }, { status: 500 });
  }

  await logUsage(user.id, "generate");

  return NextResponse.json({ draft, remaining: remaining - 1 });
}
