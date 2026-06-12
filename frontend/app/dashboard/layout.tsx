import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GitBranch, LayoutDashboard, Database, Settings, LogOut } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import OnboardingTour from "@/components/OnboardingTour";

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

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.user_name as string) ??
    user.email ??
    "Usuário";

  return (
    <div className="flex min-h-screen">
      <OnboardingTour />
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-white/5 bg-[rgb(15,15,18)]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-white/5 px-4">
          <GitBranch className="h-5 w-5 text-brand" suppressHydrationWarning />
          <span className="font-semibold text-white">CommitPost</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" suppressHydrationWarning />}>
            Rascunhos
          </NavLink>
          <NavLink href="/dashboard/repos" icon={<Database className="h-4 w-4" suppressHydrationWarning />}>
            Repositórios
          </NavLink>
          <NavLink href="/dashboard/settings" icon={<Settings className="h-4 w-4" suppressHydrationWarning />}>
            Configurações
          </NavLink>
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="h-7 w-7 rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/30 text-xs font-semibold text-brand-light">
                {name[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/80">{name}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/90"
    >
      {icon}
      {children}
    </Link>
  );
}
