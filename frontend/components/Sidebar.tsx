"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  LayoutDashboard,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";
import OnboardingTour from "./OnboardingTour";

interface SidebarProps {
  user: { avatarUrl?: string; name: string };
  setupComplete: boolean;
  children: React.ReactNode;
}

export default function Sidebar({ user, setupComplete, children }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("sidebar_collapsed") === "true") setCollapsed(true);
    } catch {
      // private browsing — ignore
    }
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Avoid layout flash before localStorage is read
  const sidebarW = !mounted ? "w-56" : collapsed ? "w-16" : "w-56";
  const mainML = !mounted ? "ml-56" : collapsed ? "ml-16" : "ml-56";

  return (
    <div className="flex min-h-screen">
      <OnboardingTour setupComplete={setupComplete} />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/5 bg-[rgb(15,15,18)] transition-[width] duration-200 ${sidebarW}`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-white/5 px-3">
          <GitBranch className="h-5 w-5 shrink-0 text-brand" suppressHydrationWarning />
          {!collapsed && (
            <span className="flex-1 truncate font-semibold text-white">CommitPost</span>
          )}
          {!collapsed && (
            <div className="shrink-0">
              <NotificationBell />
            </div>
          )}
          <button
            onClick={toggle}
            title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            className="ml-auto shrink-0 text-white/25 transition-colors hover:text-white/60"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" suppressHydrationWarning />
            ) : (
              <ChevronLeft className="h-4 w-4" suppressHydrationWarning />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          <NavLink
            href="/dashboard"
            icon={<LayoutDashboard className="h-4 w-4 shrink-0" suppressHydrationWarning />}
            label="Rascunhos"
            collapsed={collapsed}
          />
          <NavLink
            href="/dashboard/repos"
            icon={<Database className="h-4 w-4 shrink-0" suppressHydrationWarning />}
            label="Repositórios"
            collapsed={collapsed}
          />
          <NavLink
            href="/dashboard/settings"
            icon={<Settings className="h-4 w-4 shrink-0" suppressHydrationWarning />}
            label="Configurações"
            collapsed={collapsed}
          />
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-7 w-7 shrink-0 rounded-full"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/30 text-xs font-semibold text-brand-light">
                {user.name[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/80">{user.name}</p>
                </div>
                <LogoutButton />
              </>
            )}
          </div>
        </div>
      </aside>

      <main className={`${mainML} flex-1 p-6 transition-[margin] duration-200`}>
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/90"
    >
      {icon}
      {!collapsed && label}
    </Link>
  );
}
