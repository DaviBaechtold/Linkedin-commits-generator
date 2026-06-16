import Link from "next/link";
import { GitBranch, ArrowLeft } from "lucide-react";

export default function LegalShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[rgb(10,10,12)] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[rgb(10,10,12)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-white"
          >
            <GitBranch className="h-4.5 w-4.5 text-brand" />
            CommitPost
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao início
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs text-white/35">
          Última atualização: {updatedAt}
        </p>

        <div className="legal-prose mt-10 space-y-8 text-sm leading-relaxed text-white/60">
          {children}
        </div>

        <div className="mt-16 border-t border-white/[0.06] pt-8 text-xs text-white/30">
          <p>
            Dúvidas sobre seus dados? Escreva para{" "}
            <a
              href="mailto:davicampos2002@gmail.com"
              className="text-brand-light hover:underline"
            >
              davicampos2002@gmail.com
            </a>
            .
          </p>
          <div className="mt-3 flex gap-4">
            <Link href="/privacidade" className="hover:text-white/60">
              Política de Privacidade
            </Link>
            <Link href="/termos" className="hover:text-white/60">
              Termos de Uso
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Título de seção dentro de uma página legal. */
export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-white/90">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
