import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/generated-types";
import type { NotificationType } from "@/lib/supabase/types";

type Service = SupabaseClient<Database>;

/**
 * Cria uma notificação in-app para o usuário. Best-effort: qualquer falha é
 * logada e engolida — NUNCA deve quebrar o fluxo que a disparou (ex: cron).
 * Insert via service client (ignora RLS); o cliente nunca insere.
 */
export async function notify(
  service: Service,
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  draftId?: string | null
): Promise<void> {
  try {
    const { error } = await service.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      draft_id: draftId ?? null,
    });
    if (error) console.error("notify insert error:", error.message);
  } catch (err) {
    console.error("notify failed:", err);
  }
}
