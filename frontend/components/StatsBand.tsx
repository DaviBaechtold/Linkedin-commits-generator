"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Clock, CalendarClock, Sparkles, Heart, type LucideIcon } from "lucide-react";

export interface Stat {
  key: string;
  label: string;
  value: number;
  icon: "posted" | "pending" | "scheduled" | "generated" | "engagement";
  accent: string;
}

const ICONS: Record<Stat["icon"], LucideIcon> = {
  posted: Send,
  pending: Clock,
  scheduled: CalendarClock,
  generated: Sparkles,
  engagement: Heart,
};

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, durationMs]);

  return { value, ref };
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const { value, ref } = useCountUp(stat.value);
  const Icon = ICONS[stat.icon];
  return (
    <div
      ref={ref}
      className="card flex items-center gap-4 transition-transform hover:-translate-y-0.5"
      style={{ animation: `statIn .45s ${index * 70}ms ease both` }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${stat.accent}1f`, color: stat.accent }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-white tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-white/40">{stat.label}</p>
      </div>
    </div>
  );
}

export default function StatsBand({ stats }: { stats: Stat[] }) {
  return (
    <>
      <style>{`@keyframes statIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <StatCard key={s.key} stat={s} index={i} />
        ))}
      </div>
    </>
  );
}
