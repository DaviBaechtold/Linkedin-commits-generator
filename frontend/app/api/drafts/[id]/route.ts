import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const validStatuses = ["pending", "discarded"] as const;
  type ValidStatus = (typeof validStatuses)[number];

  const update: {
    status?: ValidStatus;
    post_text?: string;
  } = {};

  if (body.status !== undefined) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status as ValidStatus;
  }

  if (body.post_text !== undefined) {
    const text = String(body.post_text).trim();
    if (!text) return NextResponse.json({ error: "Texto não pode ser vazio." }, { status: 400 });
    update.post_text = text;
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("drafts")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
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
  await service.from("drafts").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
