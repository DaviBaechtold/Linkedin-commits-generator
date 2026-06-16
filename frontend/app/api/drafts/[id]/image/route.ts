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

/**
 * Confere os "magic bytes" iniciais do arquivo contra o MIME declarado.
 * O `file.type` é controlado pelo cliente — sem esta checagem, um arquivo
 * arbitrário poderia ser enviado com Content-Type de imagem.
 */
function sniffMimeMatches(buf: Buffer, declaredType: string): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return declaredType === "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return declaredType === "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return declaredType === "image/webp";
  }
  return false;
}

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

  const buffer = Buffer.from(await file.arrayBuffer());

  // Valida o conteúdo real do arquivo, não só o Content-Type declarado.
  if (!sniffMimeMatches(buffer, file.type)) {
    return NextResponse.json(
      { error: "O arquivo não é uma imagem válida (JPG, PNG ou WebP)." },
      { status: 400 }
    );
  }

  const path = `${user.id}/${id}-${Date.now()}.${ext}`;

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
    console.error("Image update error:", updErr);
    return NextResponse.json({ error: "Falha ao salvar a imagem." }, { status: 500 });
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
  if (error) {
    console.error("Image delete update error:", error);
    return NextResponse.json({ error: "Falha ao remover a imagem." }, { status: 500 });
  }

  return NextResponse.json(updated);
}
