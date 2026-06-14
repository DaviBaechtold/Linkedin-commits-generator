"use client";

import { useEffect, useState } from "react";

export interface ActivityBucket {
  label: string; // ex.: "12/05"
  value: number;
}

export default function ActivityChart({ data }: { data: ActivityBucket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-white">Atividade</h3>
        <span className="text-xs text-white/30">{total} no período</span>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-xs text-white/25">
          Sem atividade ainda. Gere seu primeiro post.
        </p>
      ) : (
        <div className="flex h-24 items-end gap-1.5">
          {data.map((d, i) => {
            const pct = mounted ? (d.value / max) * 100 : 0;
            return (
              <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-[3px] bg-brand/70 transition-all duration-700 ease-out group-hover:bg-brand"
                    style={{ height: `${Math.max(pct, d.value > 0 ? 6 : 0)}%`, transitionDelay: `${i * 45}ms` }}
                    title={`${d.value} em ${d.label}`}
                  />
                </div>
                <span className="text-[9px] text-white/25">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
