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

  const validStatuses = ["pending", "discarded", "scheduled"] as const;
  type ValidStatus = (typeof validStatuses)[number];

  const update: {
    status?: ValidStatus;
    post_text?: string;
    hashtags?: string[];
    scheduled_for?: string | null;
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

  if (body.scheduled_for !== undefined) {
    if (body.scheduled_for === null || body.scheduled_for === "") {
      update.scheduled_for = null;
    } else {
      const d = new Date(body.scheduled_for);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Data inválida." }, { status: 400 });
      }
      if (d <= new Date()) {
        return NextResponse.json({ error: "Data deve ser no futuro." }, { status: 400 });
      }
      update.scheduled_for = d.toISOString();
      update.status = "scheduled";
    }
  }

  if (body.hashtags !== undefined) {
    if (!Array.isArray(body.hashtags)) {
      return NextResponse.json({ error: "hashtags deve ser um array." }, { status: 400 });
    }
    update.hashtags = (body.hashtags as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .slice(0, 10);
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
