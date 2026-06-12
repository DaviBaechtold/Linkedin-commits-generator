"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">Algo deu errado</p>
          <p className="mt-1 text-xs text-white/35">
            {error.message ?? "Erro ao carregar o dashboard."}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-secondary">
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
          <button onClick={() => router.push("/login")} className="btn-ghost">
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
