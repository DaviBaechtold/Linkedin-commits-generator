export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(10,10,12)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-14 w-14 animate-pulse rounded-xl bg-white/5" />
          <div className="h-5 w-44 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-3.5 w-52 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 flex flex-col gap-4">
          <div className="h-11 w-full animate-pulse rounded-lg bg-white/5" />
          <div className="h-8 w-full animate-pulse rounded bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}
