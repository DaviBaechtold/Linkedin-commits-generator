import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publishPost, verifyToken } from "@/lib/linkedin";
import { logUsage } from "@/lib/rate-limit";

export const maxDuration = 30;

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

  // Busca rascunho + integração LinkedIn em paralelo
  const [draftResult, liResult] = await Promise.all([
    service
      .from("drafts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    service
      .from("integrations")
      .select("access_token,provider_user_id,expires_at")
      .eq("user_id", user.id)
      .eq("provider", "linkedin")
      .maybeSingle(),
  ]);

  if (draftResult.error || !draftResult.data) {
    return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
  }

  const draft = draftResult.data;

  if (draft.status !== "pending") {
    return NextResponse.json(
      { error: "Apenas rascunhos pendentes podem ser publicados." },
      { status: 400 }
    );
  }

  if (!liResult.data) {
    return NextResponse.json(
      { error: "LinkedIn não conectado. Vá em Configurações." },
      { status: 400 }
    );
  }

  const { access_token, provider_user_id, expires_at } = liResult.data;

  // Verifica expiração
  if (expires_at && new Date(expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Token LinkedIn expirado. Reconecte em Configurações." },
      { status: 401 }
    );
  }

  if (!provider_user_id) {
    return NextResponse.json(
      { error: "ID do perfil LinkedIn não encontrado. Reconecte." },
      { status: 400 }
    );
  }

  // Publica
  let postId: string;
  try {
    const result = await publishPost(
      access_token,
      provider_user_id,
      draft.post_text
    );
    postId = result.postId;
  } catch (err) {
    console.error("LinkedIn publish error:", err);
    return NextResponse.json(
      { error: "Falha ao publicar no LinkedIn. Verifique o token." },
      { status: 502 }
    );
  }

  // Atualiza status
  const { data: updated } = await service
    .from("drafts")
    .update({ status: "posted", linkedin_post_id: postId })
    .eq("id", id)
    .select()
    .single();

  await logUsage(user.id, "publish");

  return NextResponse.json(updated);
}
