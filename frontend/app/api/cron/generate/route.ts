import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generatePostText, type AIConfig } from "@/lib/ai";
import { generateImage, type ImageConfig } from "@/lib/image";
import { getDefaultModel, type AIProvider } from "@/lib/ai-providers";
import type { ImageProvider } from "@/lib/image-providers";
import { fetchCommits, formatCommitsForPrompt, type GitHubCommit } from "@/lib/github";
import { decryptToken } from "@/lib/crypto";

export const maxDuration = 60;

function isDue(lastGeneratedAt: string | null, frequency: string, autoHour: number): boolean {
  const nowUtcHour = new Date().getUTCHours();
  // Only process during the configured UTC hour (±1h tolerance)
  if (Math.abs(nowUtcHour - autoHour) > 1 && !(nowUtcHour === 23 && autoHour === 0)) return false;

  if (!lastGeneratedAt) return true;

  const hoursSinceLast = (Date.now() - new Date(lastGeneratedAt).getTime()) / 3_600_000;
  if (frequency === "daily") return hoursSinceLast >= 20;
  if (frequency === "weekly") return hoursSinceLast >= 7 * 24 - 4;

  return false;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: prefsList } = await service
    .from("user_preferences")
    .select("*")
    .eq("auto_post_enabled", true);

  if (!prefsList || prefsList.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  let generated = 0;

  for (const pref of prefsList) {
    const userId = pref.user_id;

    try {
      const frequency = (pref.auto_post_frequency as string) ?? "weekly";
      const autoHour = (pref.auto_post_hour as number) ?? 9;
      const graceHours = (pref.auto_post_grace_hours as number) ?? 2;

      if (!isDue(pref.auto_post_last_generated_at as string | null, frequency, autoHour)) continue;

      const aiProvider = ((pref.ai_provider as AIProvider) ?? "gemini") as AIProvider;
      const aiModel = (pref.ai_model as string) ?? getDefaultModel(aiProvider);
      const language = (pref.post_language as string) ?? "pt-BR";
      const profileInstructions = (pref.profile_instructions as string | undefined) ?? undefined;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - ((pref.commits_since_days as number) ?? 30));
      const enableImages = (pref.enable_images as boolean) ?? true;
      const imageStyle = (pref.image_style as string) ?? "professional";
      const imageProvider = ((pref.image_provider as ImageProvider) ?? "pollinations") as ImageProvider;

      const [aiIntegration, ghIntegration, reposResult, linkedinInt] = await Promise.all([
        service
          .from("integrations")
          .select("access_token")
          .eq("user_id", userId)
          .eq("provider", aiProvider)
          .maybeSingle(),
        service
          .from("integrations")
          .select("access_token,provider_username")
          .eq("user_id", userId)
          .eq("provider", "github")
          .maybeSingle(),
        service.from("repos").select("*").eq("user_id", userId).eq("enabled", true),
        service
          .from("integrations")
          .select("access_token,provider_user_id,expires_at")
          .eq("user_id", userId)
          .eq("provider", "linkedin")
          .maybeSingle(),
      ]);

      if (!aiIntegration.data?.access_token) continue;
      const repos = reposResult.data ?? [];
      if (repos.length === 0) continue;

      const aiConfig: AIConfig = {
        provider: aiProvider,
        model: aiModel,
        apiKey: decryptToken(aiIntegration.data.access_token),
      };

      let allCommits: GitHubCommit[] = [];
      if (ghIntegration.data?.access_token) {
        const token = decryptToken(ghIntegration.data.access_token);
        const login = (ghIntegration.data.provider_username as string | null) ?? undefined;
        const arrays = await Promise.all(
          repos
            .filter((r) => r.github_full_name)
            .map((r) => fetchCommits(token, r.github_full_name!, r.alias, sinceDate, login))
        );
        allCommits = arrays.flat();
      }

      const rawLogSummary =
        allCommits.length > 0
          ? formatCommitsForPrompt(allCommits)
          : repos.map((r) => `[${r.alias}] Atividade recente de desenvolvimento`).join("\n");

      const postText = await generatePostText(rawLogSummary, language, aiConfig, profileInstructions);

      const draftId = Date.now().toString();
      let visualAssets: { url: string; mime_type: string }[] = [];
      if (enableImages) {
        let imageApiKey: string | undefined;
        let imageAccountId: string | undefined;
        if (imageProvider === "dalle") {
          const { data } = await service
            .from("integrations")
            .select("access_token")
            .eq("user_id", userId)
            .eq("provider", "openai")
            .maybeSingle();
          imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
        } else if (imageProvider === "fal") {
          const { data } = await service
            .from("integrations")
            .select("access_token")
            .eq("user_id", userId)
            .eq("provider", "fal")
            .maybeSingle();
          imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
        } else if (imageProvider === "cloudflare") {
          const { data } = await service
            .from("integrations")
            .select("access_token,provider_user_id")
            .eq("user_id", userId)
            .eq("provider", "cloudflare")
            .maybeSingle();
          imageApiKey = data?.access_token ? decryptToken(data.access_token) : undefined;
          imageAccountId = data?.provider_user_id ?? undefined;
        }
        const imageConfig: ImageConfig = {
          provider: imageProvider,
          apiKey: imageApiKey,
          accountId: imageAccountId,
          userId,
        };
        const imageUrl = await generateImage(postText, draftId, imageStyle, imageConfig);
        if (imageUrl) visualAssets = [{ url: imageUrl, mime_type: "image/jpeg" }];
      }

      const hasLinkedIn =
        !!linkedinInt.data?.access_token &&
        (!linkedinInt.data.expires_at ||
          new Date(linkedinInt.data.expires_at as string) > new Date());

      const scheduledFor = hasLinkedIn
        ? new Date(Date.now() + graceHours * 3_600_000).toISOString()
        : null;

      await service.from("drafts").insert({
        user_id: userId,
        post_text: postText,
        raw_log_summary: rawLogSummary,
        visual_assets: visualAssets,
        status: hasLinkedIn ? "scheduled" : "pending",
        repos_used: repos.map((r) => r.alias),
        model_used: `${aiProvider}/${aiModel}`,
        scheduled_for: scheduledFor,
        auto_generated: true,
      });

      await service
        .from("user_preferences")
        .update({ auto_post_last_generated_at: new Date().toISOString() })
        .eq("user_id", userId);

      generated++;
    } catch (err) {
      console.error(`Auto-generate error for user ${userId}:`, err);
    }
  }

  return NextResponse.json({ generated });
}
