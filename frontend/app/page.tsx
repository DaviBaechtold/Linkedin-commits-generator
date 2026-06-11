import Link from "next/link";
import { GitBranch, Linkedin, Sparkles, ShieldCheck, Eye } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[rgb(10,10,12)]">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[rgb(10,10,12)]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold text-white">
            <GitBranch className="h-5 w-5 text-brand" />
            CommitPost
          </span>
          <Link href="/login" className="btn-primary text-xs py-1.5 px-3">
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-36 pb-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand-light">
          <Sparkles className="h-3 w-3" />
          Powered by Gemini AI
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Seus commits viram{" "}
          <span className="text-brand-light">posts no LinkedIn</span>
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-white/50">
          Conecte seu GitHub, escolha os repositórios e deixe a IA gerar posts
          profissionais a partir do seu histórico de commits — sem expor código
          ou informações confidenciais.
        </p>
        <Link href="/login" className="btn-primary px-6 py-3 text-base">
          Começar grátis
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<GitBranch className="h-5 w-5 text-brand-light" />}
            title="GitHub ou upload manual"
            desc="Conecte via OAuth ou cole o output do git log — você escolhe."
          />
          <FeatureCard
            icon={<Eye className="h-5 w-5 text-yellow-400" />}
            title="Revisão antes de publicar"
            desc="Todo post passa pela sua aprovação. Regenere texto ou imagem com um clique."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-green-400" />}
            title="Filtro NDA embutido"
            desc="Nomes de empresas, clientes e código nunca aparecem nos posts."
          />
        </div>
      </section>

      {/* Flow */}
      <section className="mx-auto max-w-3xl px-4 pb-32 text-center">
        <p className="mb-6 text-sm font-medium uppercase tracking-wider text-white/30">
          Como funciona
        </p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-0">
          {["GitHub", "Gemini AI", "Você revisa", "LinkedIn"].map(
            (step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-sm text-white/70">
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <span className="text-white/20 sm:px-1">→</span>
                )}
              </div>
            )
          )}
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-white/25">
        CommitPost — geração responsável de conteúdo profissional
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </div>
      <p className="font-medium text-white">{title}</p>
      <p className="text-sm text-white/45">{desc}</p>
    </div>
  );
}
