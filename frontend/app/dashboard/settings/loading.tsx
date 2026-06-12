export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <div className="mb-2">
        <div className="h-5 w-28 animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-white/[0.04]" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="mb-4 h-4 w-36 rounded bg-white/10" />
          <div className="flex flex-col gap-3">
            <div className="h-9 w-full rounded-lg bg-white/5" />
            <div className="h-9 w-full rounded-lg bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  );
}
