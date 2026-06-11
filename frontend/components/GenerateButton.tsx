"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  hasLinkedIn: boolean;
  hasRepos: boolean;
}

export default function GenerateButton({ hasLinkedIn, hasRepos }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const canGenerate = hasRepos;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao gerar post.");
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        className="btn-primary"
        title={!hasRepos ? "Adicione repositórios primeiro" : undefined}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? "Gerando..." : "Gerar post"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
