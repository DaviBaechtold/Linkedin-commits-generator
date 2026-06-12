export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[rgb(10,10,12)]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[rgb(10,10,12)]/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="h-5 w-28 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-7 w-16 animate-pulse rounded-lg bg-white/5" />
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4 pt-36 pb-20 flex flex-col items-center gap-5">
        <div className="h-6 w-36 animate-pulse rounded-full bg-white/5" />
        <div className="h-12 w-3/4 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-12 w-2/3 animate-pulse rounded-xl bg-white/[0.04]" />
        <div className="h-4 w-80 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/[0.03]" />
        <div className="mt-4 h-11 w-36 animate-pulse rounded-lg bg-white/5" />
      </div>
    </div>
  );
}
