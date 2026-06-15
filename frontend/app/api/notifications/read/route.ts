import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Corpo opcional: { id } marca uma só; sem id marca todas as não lidas.
  let id: string | undefined;
  try {
    const body = await request.json();
    id = typeof body?.id === "string" ? body.id : undefined;
  } catch {
    // sem corpo → marca todas
  }

  const service = createServiceClient();
  let query = service
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (id) query = query.eq("id", id);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "Falha ao marcar como lida." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
