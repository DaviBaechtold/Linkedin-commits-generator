import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureEncrypted, isEncrypted, isValidCronAuth } from "@/lib/crypto";

export const maxDuration = 60;

/**
 * Migração one-shot: re-cifra tokens legados (plaintext) na tabela
 * `integrations`. Idempotente — registros já cifrados (prefixo `v1:`) são
 * ignorados. Protegido pelo `CRON_SECRET`.
 *
 * Uso (uma vez, após o deploy):
 *   curl -X POST https://<app>/api/admin/reencrypt \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (!isValidCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: rows, error } = await service
    .from("integrations")
    .select("id,access_token");

  if (error) {
    console.error("Reencrypt: fetch error", error);
    return NextResponse.json({ error: "Falha ao ler integrações." }, { status: 500 });
  }

  let scanned = 0;
  let reencrypted = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    scanned++;
    const stored = row.access_token as string | null;
    if (!stored || isEncrypted(stored)) continue;

    const encrypted = ensureEncrypted(stored);
    if (!encrypted) continue;

    const { error: updErr } = await service
      .from("integrations")
      .update({ access_token: encrypted })
      .eq("id", row.id);

    if (updErr) {
      failed++;
      console.error(`Reencrypt: update failed for ${row.id}`, updErr);
    } else {
      reencrypted++;
    }
  }

  return NextResponse.json({ scanned, reencrypted, failed });
}
