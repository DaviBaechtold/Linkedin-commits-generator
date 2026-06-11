"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GitBranch, Github } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleGitHubLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        // Pede permissão de leitura de repos para buscar commits
        scopes: "read:user user:email repo",
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(10,10,12)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-brand/15 p-3">
            <GitBranch className="h-7 w-7 text-brand-light" suppressHydrationWarning />
          </div>
          <h1 className="text-xl font-semibold text-white">
            Entrar no CommitPost
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Use sua conta GitHub para continuar
          </p>
        </div>

        {/* Auth card */}
        <div className="card flex flex-col gap-4">
          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            className="btn-secondary w-full justify-center py-3"
          >
            <Github className="h-5 w-5" suppressHydrationWarning />
            {loading ? "Redirecionando..." : "Continuar com GitHub"}
          </button>

          <p className="text-center text-xs text-white/25">
            Ao entrar você concorda com os Termos de Uso.
            <br />
            Seus commits são processados com filtro NDA — nenhum dado
            confidencial é publicado.
          </p>
        </div>
      </div>
    </div>
  );
}
