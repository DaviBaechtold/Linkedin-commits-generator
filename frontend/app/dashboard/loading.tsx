export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded-lg bg-white/5" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-white/5" />
      </div>

      {/* Cards skeleton */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
            style={{ opacity: 1 - i * 0.2 }}
          >
            <div className="flex items-start gap-3">
              <div className="h-4 w-4 mt-0.5 shrink-0 rounded-full bg-white/10" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-2/3 rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/[0.06]" />
                <div className="h-3 w-4/5 rounded bg-white/[0.06]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
