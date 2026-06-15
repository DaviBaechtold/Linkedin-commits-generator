import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: notifications } = await service
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.read).length;

  return NextResponse.json({ notifications: list, unreadCount });
}
