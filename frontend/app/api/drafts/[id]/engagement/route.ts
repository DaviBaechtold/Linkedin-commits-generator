import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPostEngagement } from "@/lib/linkedin";
import { decryptToken } from "@/lib/crypto";

export const maxDuration = 20;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const [draftResult, liResult] = await Promise.all([
    service
      .from("drafts")
      .select("id,status,linkedin_post_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    service
      .from("integrations")
      .select("access_token,expires_at")
      .eq("user_id", user.id)
      .eq("provider", "linkedin")
      .maybeSingle(),
  ]);

  const draft = draftResult.data as
    | { id: string; status: string; linkedin_post_id: string | null }
    | null;
  if (!draft) {
    return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
  }
  if (draft.status !== "posted" || !draft.linkedin_post_id) {
    return NextResponse.json(
      { error: "Só posts publicados têm métricas." },
      { status: 400 }
    );
  }
  if (!liResult.data?.access_token) {
    return NextResponse.json({ error: "LinkedIn não conectado." }, { status: 400 });
  }

  const token = decryptToken(liResult.data.access_token);
  const engagement = await getPostEngagement(token, draft.linkedin_post_id);

  const update: {
    engagement_synced_at: string;
    likes_count?: number;
    comments_count?: number;
  } = { engagement_synced_at: new Date().toISOString() };
  if (engagement) {
    update.likes_count = engagement.likes;
    update.comments_count = engagement.comments;
  }

  const { data: updated } = await service
    .from("drafts")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return NextResponse.json({ draft: updated, synced: !!engagement });
}
