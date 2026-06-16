"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GitBranch, Github } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleGitHubLogin() {
    if (!accepted) return;
    setLoading(true);
    // Cliente instanciado no clique (browser), não no prerender estático —
    // evita quebrar o build quando as env vars não estão no contexto de build.
    const supabase = createClient();
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
          {/* Consentimento (LGPD) — obrigatório antes do OAuth */}
          <label className="flex cursor-pointer items-start gap-2.5 text-left">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand"
            />
            <span className="text-xs leading-relaxed text-white/45">
              Li e concordo com os{" "}
              <Link
                href="/termos"
                target="_blank"
                className="text-brand-light hover:underline"
              >
                Termos de Uso
              </Link>{" "}
              e com a{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="text-brand-light hover:underline"
              >
                Política de Privacidade
              </Link>
              , incluindo o tratamento dos meus dados conforme a LGPD.
            </span>
          </label>

          <button
            onClick={handleGitHubLogin}
            disabled={loading || !accepted}
            className="btn-secondary w-full justify-center py-3"
            title={!accepted ? "Aceite os termos para continuar" : undefined}
          >
            <Github className="h-5 w-5" suppressHydrationWarning />
            {loading ? "Redirecionando..." : "Continuar com GitHub"}
          </button>

          <p className="text-center text-xs text-white/25">
            Seus commits são processados com filtro NDA — nenhum dado
            confidencial é publicado.
          </p>
        </div>
      </div>
    </div>
  );
}
