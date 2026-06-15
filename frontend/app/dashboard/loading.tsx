export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-6 w-24 rounded-lg bg-white/[0.07]" />
          <div className="mt-2 h-4 w-44 rounded bg-white/[0.04]" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-white/[0.07]" />
      </div>

      {/* Stats band */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.04]" />
        ))}
      </div>

      {/* Content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Draft cards */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-20 rounded-full bg-white/[0.07]" />
                <div className="h-4 w-4 rounded bg-white/[0.05]" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.05]" />
                <div className="h-3 w-5/6 rounded bg-white/[0.05]" />
                <div className="h-3 w-4/6 rounded bg-white/[0.04]" />
              </div>
              <div className="mt-5 flex gap-2">
                <div className="h-8 w-24 rounded-lg bg-white/[0.07]" />
                <div className="h-8 w-20 rounded-lg bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          <div className="h-48 rounded-xl bg-white/[0.04]" />
          <div className="h-32 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
