"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleAlert, FileText, Send } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/supabase/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function iconFor(type: NotificationType) {
  if (type === "auto_post_published") return <Send className="h-4 w-4 text-emerald-400" />;
  if (type === "auto_post_failed") return <CircleAlert className="h-4 w-4 text-amber-400" />;
  return <FileText className="h-4 w-4 text-brand-light" />;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // silencioso
    }
  }, []);

  // Busca ao montar.
  useEffect(() => {
    load();
  }, [load]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load(); // refetch ao abrir
  }

  async function markAll() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read", { method: "POST" });
    } catch {
      // silencioso
    }
  }

  async function onItemClick(n: Notification) {
    setOpen(false);
    if (!n.read) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        });
      } catch {
        // silencioso
      }
    }
    router.push("/dashboard");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        title="Notificações"
        className="relative text-white/40 transition-colors hover:text-white/80"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-80 overflow-hidden rounded-xl border border-white/10 bg-[rgb(20,20,24)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <span className="text-xs font-semibold text-white/80">Notificações</span>
            {items.some((n) => !n.read) && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/70"
              >
                <CheckCheck className="h-3 w-3" /> marcar todas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-white/30">
                Nenhuma notificação ainda.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={`flex w-full gap-2.5 border-b border-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{iconFor(n.type)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                      <span className="truncate text-xs font-medium text-white/90">{n.title}</span>
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/50">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[10px] text-white/30">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
