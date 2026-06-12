export default function ReposLoading() {
  return (
    <div className="mx-auto max-w-xl flex flex-col gap-4">
      <div className="mb-2">
        <div className="h-5 w-28 animate-pulse rounded bg-white/5" />
        <div className="mt-2 h-3 w-48 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-white/5" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-white/[0.03]" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
          style={{ opacity: 1 - i * 0.2 }}
        >
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3.5 w-48 rounded bg-white/10" />
            <div className="h-3 w-32 rounded bg-white/[0.06]" />
          </div>
          <div className="h-5 w-5 rounded-full bg-white/5" />
          <div className="h-4 w-4 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
