"use client";

import { Search } from "lucide-react";

export type DraftFilter = "all" | "pending" | "posted" | "scheduled";

export const FILTERS: { key: DraftFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "posted", label: "Publicados" },
  { key: "scheduled", label: "Agendados" },
];

interface Props {
  filter: DraftFilter;
  onFilter: (f: DraftFilter) => void;
  search: string;
  onSearch: (s: string) => void;
  counts: Record<DraftFilter, number>;
}

export default function DraftFilters({ filter, onFilter, search, onSearch, counts }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-brand/20 text-brand-light"
                  : "text-white/45 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              {f.label}
              <span className={`tabular-nums ${active ? "text-brand-light/70" : "text-white/25"}`}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative sm:w-56">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar nos rascunhos..."
          className="input pl-9 py-1.5 text-xs"
        />
      </div>
    </div>
  );
}
