import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [aiResult, reposResult, prefsResult] = await Promise.all([
    supabase
      .from("integrations")
      .select("id")
      .in("provider", ["gemini", "openai", "anthropic", "deepseek", "groq", "mistral", "xai"])
      .limit(1),
    supabase.from("repos").select("id").limit(1),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const onboardingFlag =
    ((prefsResult.data as Record<string, unknown> | null)?.onboarding_completed as
      | boolean
      | undefined) ?? false;
  const setupHeuristic =
    (aiResult.data?.length ?? 0) > 0 && (reposResult.data?.length ?? 0) > 0;
  const setupComplete = onboardingFlag || setupHeuristic;

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.user_name as string) ??
    user.email ??
    "Usuário";

  return (
    <Sidebar user={{ avatarUrl, name }} setupComplete={setupComplete}>
      {children}
    </Sidebar>
  );
}
