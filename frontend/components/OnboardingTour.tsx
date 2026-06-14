"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ArrowRight } from "lucide-react";

const STORAGE_KEY = "commitpost_tour_v1";
const GOLD = "#D4AF37";

interface ModalStep {
  kind: "modal";
  title: string;
  body: React.ReactNode;
  nextLabel: string;
}

interface SpotlightStep {
  kind: "spotlight";
  path: string;
  target: string;
  title: string;
  body: string;
  nextLabel: string;
}

type TourStep = ModalStep | SpotlightStep;

const STEPS: TourStep[] = [
  {
    kind: "modal",
    title: "Bem-vindo ao CommitPost! 👋",
    body: (
      <div className="flex flex-col gap-5">
        <p className="text-base leading-relaxed text-white/75">
          O <strong className="text-white">CommitPost</strong> transforma seus commits do
          GitHub em posts profissionais para o LinkedIn — de forma automática e sem expor
          código ou dados confidenciais.
        </p>
        <div className="flex flex-col gap-2.5">
          {(
            [
              ["🔗", "Conecte seu GitHub e LinkedIn"],
              ["🤖", "A IA escreve posts a partir dos seus commits"],
              ["📅", "Revise e publique — ou deixe o auto-post fazer isso"],
            ] as [string, string][]
          ).map(([icon, text]) => (
            <div
              key={text}
              className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3"
            >
              <span className="text-xl">{icon}</span>
              <p className="text-sm text-white/70">{text}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    nextLabel: "Próximo",
  },
  {
    kind: "modal",
    title: "100% gratuito, você no controle",
    body: (
      <div className="flex flex-col gap-5">
        <p className="text-base leading-relaxed text-white/70">
          Você traz sua própria chave de API de IA. Assim você controla os custos — e o
          Gemini oferece um plano gratuito generoso para começar.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["1", "Chave de IA", "Gemini, Claude, OpenAI ou DeepSeek"],
              ["2", "Seus commits", "GitHub analisa sua atividade"],
              ["3", "Post publicado", "Com filtro NDA automático"],
            ] as [string, string, string][]
          ).map(([n, title, sub]) => (
            <div
              key={n}
              className="flex flex-col items-center gap-1.5 rounded-lg bg-white/5 p-4 text-center"
            >
              <span className="text-2xl font-bold" style={{ color: GOLD }}>
                {n}
              </span>
              <p className="text-sm font-medium text-white/85">{title}</p>
              <p className="text-xs leading-snug text-white/40">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    nextLabel: "Próximo",
  },
  {
    kind: "modal",
    title: "Estamos quase lá 🚀",
    body: (
      <div className="flex flex-col gap-4">
        <p className="text-base leading-relaxed text-white/70">
          Vamos configurar seu ambiente. Leva menos de 2 minutos.
        </p>
        <div className="flex flex-col gap-2.5">
          {(
            [
              ["🔑", "Chave de API de IA", "gratuita no Gemini"],
              ["💼", "Conta LinkedIn", "para publicação automática"],
              ["🖼️", "Provedor de imagens", "opcional — Pollinations é gratuito"],
              ["📁", "Repositórios GitHub", "base para gerar os posts"],
            ] as [string, string, string][]
          ).map(([icon, label, sub]) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-lg bg-white/[0.04] px-4 py-3"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-white/80">{label}</p>
                <p className="text-xs text-white/40">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    nextLabel: "Vamos configurar!",
  },
  {
    kind: "spotlight",
    path: "/dashboard/settings",
    target: "ai-key",
    title: "Adicione sua chave de IA",
    body: "Adicione uma chave do Gemini (gratuita), Claude, OpenAI ou DeepSeek. O CommitPost usa ela para escrever seus posts — você controla o uso direto no provedor.",
    nextLabel: "Próximo",
  },
  {
    kind: "spotlight",
    path: "/dashboard/settings",
    target: "linkedin",
    title: "Conecte o LinkedIn",
    body: "Conecte sua conta LinkedIn para publicar posts diretamente. Sem isso, os posts ficam como rascunhos para você copiar e colar manualmente.",
    nextLabel: "Próximo",
  },
  {
    kind: "spotlight",
    path: "/dashboard/settings",
    target: "image-provider",
    title: "Geração de imagens (opcional)",
    body: "Escolha como criar as imagens dos posts. O Pollinations.ai é gratuito e não requer nenhuma chave de API.",
    nextLabel: "Próximo",
  },
  {
    kind: "spotlight",
    path: "/dashboard/repos",
    target: "repos",
    title: "Adicione seus repositórios",
    body: "Importe seus repositórios do GitHub. O CommitPost vai analisar os commits para gerar posts relevantes ao que você está construindo.",
    nextLabel: "Concluir tour",
  },
];

function findWithRetry(target: string, onFound: (el: Element) => void, max = 25) {
  let tries = 0;
  const attempt = () => {
    const el = document.querySelector(`[data-tutorial="${target}"]`);
    if (el) {
      onFound(el);
    } else if (tries < max) {
      tries++;
      setTimeout(attempt, 150);
    }
  };
  attempt();
}

export default function OnboardingTour({
  setupComplete = false,
}: {
  setupComplete?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // Usuário já configurado (chave de IA + repos) → nunca mostra o tour,
    // mesmo após limpar cookies/localStorage. Persiste o estado localmente
    // para refletir o setup concluído em futuras visitas neste navegador.
    if (setupComplete) {
      localStorage.setItem(STORAGE_KEY, "1");
      return;
    }
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, [setupComplete]);

  const current = STEPS[step];

  useEffect(() => {
    if (!visible || current.kind !== "spotlight") return;
    const s = current as SpotlightStep;

    if (pathname !== s.path) {
      setNavigating(true);
      setRect(null);
      router.push(s.path);
      return;
    }

    setNavigating(false);
    findWithRetry(s.target, (el) => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setRect(el.getBoundingClientRect()), 520);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pathname, visible]);

  useEffect(() => {
    if (!visible || current.kind !== "spotlight") return;
    const target = (current as SpotlightStep).target;
    const update = () => {
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, visible, current]);

  function persistCompletion() {
    localStorage.setItem(STORAGE_KEY, "1");
    // Persiste no banco (best-effort) p/ não reaparecer ao limpar storage.
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_completed: true }),
    }).catch(() => {});
  }

  function skip() {
    persistCompletion();
    setVisible(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      skip();
      return;
    }
    setRect(null);
    setStep((s) => s + 1);
  }

  if (!visible) return null;

  const total = STEPS.length;
  const pct = Math.round(((step + 1) / total) * 100);

  if (current.kind === "modal") {
    const s = current as ModalStep;
    return (
      <>
        <style>{`@keyframes tourIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <SkipBtn onSkip={skip} />
          <div
            className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[rgb(17,17,21)] shadow-2xl"
            style={{ animation: "tourIn .2s ease-out" }}
          >
            <div className="h-1 w-full bg-white/5">
              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
            </div>
            <div className="flex flex-col gap-6 p-8">
              <h2 className="text-2xl font-bold text-white">{s.title}</h2>
              <div>{s.body}</div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-white/30">{step + 1} / {total}</span>
                <button
                  onClick={next}
                  className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold text-black transition-opacity hover:opacity-90"
                  style={{ backgroundColor: GOLD }}
                >
                  {s.nextLabel}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Spotlight step
  const s = current as SpotlightStep;
  return (
    <>
      <style>{`
        @keyframes tourPulse {
          0%,100%{box-shadow:0 0 0 9999px rgba(0,0,0,.80),0 0 0 0 rgba(212,175,55,.4)}
          50%{box-shadow:0 0 0 9999px rgba(0,0,0,.80),0 0 0 7px rgba(212,175,55,.15)}
        }
        @keyframes tourTooltipIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <SkipBtn onSkip={skip} />

      {rect && !navigating && (
        <>
          {/* Spotlight ring + dark overlay via box-shadow */}
          <div
            className="pointer-events-none fixed z-[9998] rounded-xl transition-all duration-500"
            style={{
              top: rect.top - 10,
              left: rect.left - 10,
              width: rect.width + 20,
              height: rect.height + 20,
              border: `2px solid ${GOLD}`,
              animation: "tourPulse 2.5s ease-in-out infinite",
            }}
          />
          <Tooltip step={s} stepIndex={step} total={total} rect={rect} onNext={next} />
        </>
      )}

      {navigating && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: `${GOLD}25`, borderTopColor: GOLD }}
            />
            <p className="text-xs text-white/40">Preparando...</p>
          </div>
        </div>
      )}
    </>
  );
}

function SkipBtn({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      onClick={onSkip}
      className="fixed right-5 top-5 z-[99999] flex items-center gap-1.5 rounded-full border border-white/15 bg-[rgb(17,17,21)]/90 px-3 py-1.5 text-xs text-white/50 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white/80"
    >
      <X className="h-3 w-3" />
      Pular tutorial
    </button>
  );
}

function Tooltip({
  step,
  stepIndex,
  total,
  rect,
  onNext,
}: {
  step: SpotlightStep;
  stepIndex: number;
  total: number;
  rect: DOMRect;
  onNext: () => void;
}) {
  const W = 380;
  const GAP = 16;
  const MARGIN = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceBelow = vh - rect.bottom - GAP;
  const spaceAbove = rect.top - GAP;

  const top =
    spaceBelow >= 150 || spaceBelow >= spaceAbove
      ? rect.bottom + GAP + 10
      : rect.top - GAP - 10 - 170;

  let left = rect.left + rect.width / 2 - W / 2;
  left = Math.max(MARGIN, Math.min(vw - W - MARGIN, left));

  const pct = Math.round(((stepIndex + 1) / total) * 100);

  return (
    <div
      className="fixed z-[99999] flex flex-col gap-4 rounded-xl border p-5 shadow-2xl"
      style={{
        top,
        left,
        width: W,
        background: "rgb(17,17,21)",
        borderColor: `${GOLD}30`,
        animation: "tourTooltipIn .25s ease-out",
      }}
    >
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
      </div>

      <div>
        <p className="text-base font-semibold text-white">{step.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-white/30">{stepIndex + 1} / {total}</span>
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          style={{ backgroundColor: GOLD }}
        >
          {step.nextLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
