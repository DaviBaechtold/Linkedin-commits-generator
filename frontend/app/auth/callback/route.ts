import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // Persistir o GitHub provider_token na tabela integrations
  const providerToken = data.session.provider_token;
  if (providerToken) {
    const service = createServiceClient();
    await service.from("integrations").upsert(
      {
        user_id: data.user.id,
        provider: "github",
        access_token: providerToken,
        provider_username:
          data.user.user_metadata?.user_name ??
          data.user.user_metadata?.login ??
          null,
        provider_user_id: String(
          data.user.user_metadata?.provider_id ?? data.user.id
        ),
      },
      { onConflict: "user_id,provider" }
    );
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
