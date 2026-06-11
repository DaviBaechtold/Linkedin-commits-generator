import { createServiceClient } from "@/lib/supabase/server";

const DAILY_GENERATE_LIMIT = parseInt(
  process.env.DAILY_GENERATE_LIMIT ?? "10"
);

export async function checkRateLimit(
  userId: string,
  action: "generate" | "publish" | "regen_text" | "regen_image"
): Promise<{ allowed: boolean; remaining: number }> {
  const service = createServiceClient();

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { count } = await service
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", since.toISOString());

  const used = count ?? 0;
  const limit = action === "generate" ? DAILY_GENERATE_LIMIT : 50;
  const remaining = Math.max(0, limit - used);

  return { allowed: remaining > 0, remaining };
}

export async function logUsage(
  userId: string,
  action: "generate" | "publish" | "regen_text" | "regen_image"
) {
  const service = createServiceClient();
  await service.from("usage_logs").insert({ user_id: userId, action });
}
