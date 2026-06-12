import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=linkedin_denied`
    );
  }

  // Verifica state CSRF
  const storedState = request.cookies.get("linkedin_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=invalid_state`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=missing_code`
    );
  }

  // Verifica usuário autenticado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  // Troca code por token
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
  const tokenRes = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    }
  );

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("LinkedIn token exchange failed:", body);
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=token_exchange_failed`
    );
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;
  const expiresIn: number = tokenData.expires_in ?? 5184000; // 60 dias
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Busca o person URN do LinkedIn
  let personId: string | null = null;
  let linkedinUsername: string | null = null;
  try {
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      personId = profile.sub ?? null;
      linkedinUsername = profile.name ?? profile.email ?? null;
    }
  } catch {
    // Não crítico — pode ser preenchido depois
  }

  // Persiste no banco via service_role (bypass RLS para upsert)
  const service = createServiceClient();
  await service.from("integrations").upsert(
    {
      user_id: user.id,
      provider: "linkedin",
      access_token: encryptToken(accessToken),
      expires_at: expiresAt,
      provider_user_id: personId,
      provider_username: linkedinUsername,
    },
    { onConflict: "user_id,provider" }
  );

  const response = NextResponse.redirect(
    `${appUrl}/dashboard/settings?connected=linkedin`
  );

  // Limpa o cookie de state
  response.cookies.set("linkedin_oauth_state", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
