import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const BUCKET = "post-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande (máx. 5MB)." }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato inválido. Use JPG, PNG ou WebP." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // Garante que o rascunho é do usuário.
  const { data: draft, error: draftErr } = await service
    .from("drafts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (draftErr || !draft) {
    return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
  }

  const path = `${user.id}/${id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) {
    console.error("Upload error:", upErr);
    return NextResponse.json({ error: "Falha ao enviar imagem." }, { status: 500 });
  }

  const publicUrl = service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { data: updated, error: updErr } = await service
    .from("drafts")
    .update({ visual_assets: [{ url: publicUrl, mime_type: file.type }] })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
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

  // Remove arquivos do usuário referentes a este draft (prefixo).
  const { data: list } = await service.storage
    .from(BUCKET)
    .list(user.id, { search: `${id}-` });
  if (list && list.length > 0) {
    await service.storage
      .from(BUCKET)
      .remove(list.map((f) => `${user.id}/${f.name}`));
  }

  const { data: updated, error } = await service
    .from("drafts")
    .update({ visual_assets: [] })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(updated);
}
