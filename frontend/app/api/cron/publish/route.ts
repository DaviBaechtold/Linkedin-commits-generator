import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { publishPost } from "@/lib/linkedin";
import { decryptToken } from "@/lib/crypto";
import { notify } from "@/lib/notifications";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const now = new Date().toISOString();

  const { data: drafts } = await service
    .from("drafts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  let published = 0;

  for (const draft of drafts) {
    try {
      const { data: linkedin } = await service
        .from("integrations")
        .select("access_token,provider_user_id,expires_at")
        .eq("user_id", draft.user_id)
        .eq("provider", "linkedin")
        .maybeSingle();

      if (!linkedin?.access_token || !linkedin.provider_user_id) {
        // No LinkedIn — demote to pending for manual review
        await service
          .from("drafts")
          .update({ status: "pending", scheduled_for: null })
          .eq("id", draft.id);
        await notify(
          service,
          draft.user_id,
          "auto_post_failed",
          "Post automático não publicado",
          "Conecte sua conta do LinkedIn para publicar. O post ficou aguardando revisão.",
          draft.id
        );
        continue;
      }

      if (linkedin.expires_at && new Date(linkedin.expires_at as string) < new Date()) {
        await service
          .from("drafts")
          .update({ status: "pending", scheduled_for: null })
          .eq("id", draft.id);
        await notify(
          service,
          draft.user_id,
          "auto_post_failed",
          "Post automático não publicado",
          "Sua conexão com o LinkedIn expirou. Reconecte em Configurações. O post ficou aguardando revisão.",
          draft.id
        );
        continue;
      }

      const assets = (draft.visual_assets as { url?: string }[] | null) ?? [];
      const { postId } = await publishPost(
        decryptToken(linkedin.access_token as string),
        linkedin.provider_user_id as string,
        draft.post_text as string,
        assets[0]?.url ?? null
      );

      await service
        .from("drafts")
        .update({ status: "posted", linkedin_post_id: postId, scheduled_for: null })
        .eq("id", draft.id);

      await notify(
        service,
        draft.user_id,
        "auto_post_published",
        "Post automático publicado",
        "Seu post automático foi publicado no LinkedIn.",
        draft.id
      );

      published++;
    } catch (err) {
      console.error(`Auto-publish error for draft ${draft.id}:`, err);
      await notify(
        service,
        draft.user_id,
        "auto_post_failed",
        "Falha ao publicar post automático",
        "Não consegui publicar no LinkedIn. Tente publicar manualmente pelo painel.",
        draft.id
      );
    }
  }

  return NextResponse.json({ published });
}
