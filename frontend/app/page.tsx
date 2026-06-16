"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Syne } from "next/font/google";
import {
  GitBranch, Eye, ShieldCheck, Calendar, ImageIcon,
  ArrowRight, Sparkles, KeyRound,
} from "lucide-react";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], display: "swap" });

const CYCLE = ["posts no LinkedIn", "conteúdo profissional", "presença digital"];

const PROVIDERS = [
  { name: "Gemini",   color: "#8B5CF6" },
  { name: "Claude",   color: "#D97706" },
  { name: "OpenAI",   color: "#10B981" },
  { name: "DeepSeek", color: "#3B82F6" },
];

const FEATURES = [
  {
    Icon: Calendar,
    color: "#0A66C2",
    title: "Auto-post agendado",
    desc: "Define o intervalo, a IA gera e publica sozinha — sem abrir o computador.",
  },
  {
    Icon: Eye,
    color: "#10B981",
    title: "Revisão antes de publicar",
    desc: "Todo post passa pela sua aprovação. Regenere texto ou imagem com um clique.",
  },
  {
    Icon: ShieldCheck,
    color: "#EF4444",
    title: "Filtro NDA embutido",
    desc: "Nomes de empresas, clientes e código nunca aparecem nos posts.",
  },
  {
    Icon: ImageIcon,
    color: "#F59E0B",
    title: "Geração de imagens",
    desc: "Pollinations.ai gratuito, DALL·E 3 ou Fal.ai FLUX — você escolhe.",
  },
];

const STEPS = ["GitHub", "Sua IA", "Você revisa", "LinkedIn"];

function useCycler(items: string[]) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setFading(true), 2800);
    return () => clearTimeout(hold);
  }, [idx]);

  useEffect(() => {
    if (!fading) return;
    const swap = setTimeout(() => {
      setIdx((i) => (i + 1) % items.length);
      setFading(false);
    }, 420);
    return () => clearTimeout(swap);
  }, [fading, items.length]);

  return { text: items[idx], fading };
}

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, on };
}

export default function LandingPage() {
  const { text, fading } = useCycler(CYCLE);
  const features = useReveal();
  const flow = useReveal();
  const [chipsIn, setChipsIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setChipsIn(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%,100% { opacity:.55; }
          50%      { opacity:1;   }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes cycleIn {
          from { opacity:0; filter:blur(8px); transform:translateY(7px);  }
          to   { opacity:1; filter:blur(0);   transform:translateY(0);    }
        }
        @keyframes cycleOut {
          from { opacity:1; filter:blur(0);   transform:translateY(0);    }
          to   { opacity:0; filter:blur(8px); transform:translateY(-7px); }
        }
        @keyframes connectorGrow {
          from { transform:scaleX(0); }
          to   { transform:scaleX(1); }
        }
        .cycle-in  { animation: cycleIn  .42s ease forwards; }
        .cycle-out { animation: cycleOut .36s ease forwards; }
        .fcard {
          transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
        }
        .fcard:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,.14) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,.45);
        }
      `}</style>

      <div className="min-h-screen bg-[rgb(10,10,12)] text-white overflow-x-hidden">

        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 110% 55% at 50% -2%, rgba(10,102,194,.14) 0%, transparent 65%)",
            animation: "glowPulse 9s ease-in-out infinite",
          }}
        />

        {/* Nav */}
        <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[rgb(10,10,12)]/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <GitBranch className="h-4.5 w-4.5 text-brand" />
              CommitPost
            </span>
            <Link
              href="/login"
              className="btn-primary flex items-center gap-1.5 py-1.5 px-4 text-xs"
            >
              Entrar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative z-10 mx-auto max-w-3xl px-4 pt-36 pb-24 text-center">

          {/* Badge */}
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand-light"
            style={{ animation: "fadeUp .5s .1s ease both" }}
          >
            <Sparkles className="h-3 w-3" />
            Multi-provider AI · BYOK · 100% gratuito
          </div>

          {/* Headline */}
          <h1
            className={`${syne.className} mb-1 text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl`}
            style={{ animation: "fadeUp .5s .2s ease both" }}
          >
            Seus commits viram
          </h1>

          {/* Cycling line — altura reservada p/ até 2 linhas, sem clip dos descendentes */}
          <div
            className="mb-8 flex min-h-[2.5em] items-center justify-center text-5xl sm:min-h-[2.4em] sm:text-6xl"
            style={{ animation: "fadeUp .5s .3s ease both" }}
          >
            <span
              className={`${syne.className} ${fading ? "cycle-out" : "cycle-in"} block px-2 pb-2 text-center font-extrabold leading-[1.12] text-brand-light`}
            >
              {text}
            </span>
          </div>

          {/* Subtitle */}
          <p
            className="mx-auto mb-10 max-w-md text-base leading-relaxed text-white/45"
            style={{ animation: "fadeUp .5s .4s ease both" }}
          >
            Traga sua chave de IA, conecte o GitHub e deixe o CommitPost gerar
            e publicar posts profissionais — com filtro NDA e revisão antes de
            qualquer publicação.
          </p>

          {/* CTA */}
          <div style={{ animation: "fadeUp .5s .5s ease both" }}>
            <Link
              href="/login"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Features Bento ── */}
        <section className="relative z-10 mx-auto max-w-5xl px-4 pb-28">
          <div
            ref={features.ref}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {/* BYOK — large card */}
            <div
              className="fcard col-span-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:col-span-2"
              style={{
                opacity: features.on ? 1 : 0,
                transform: features.on ? "translateY(0)" : "translateY(22px)",
                transition: "opacity .5s ease, transform .5s ease",
              }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(139,92,246,.15)", color: "#8B5CF6" }}
              >
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-white">
                Traga sua própria chave de IA
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-white/40">
                Você controla os custos diretamente na plataforma. O Gemini
                oferece plano gratuito generoso para começar.
              </p>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((p, i) => (
                  <span
                    key={p.name}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: `${p.color}18`,
                      border: `1px solid ${p.color}35`,
                      color: p.color,
                      opacity: chipsIn ? 1 : 0,
                      transform: chipsIn ? "translateY(0) scale(1)" : "translateY(8px) scale(.92)",
                      transition: `opacity .35s ${i * 75}ms ease, transform .35s ${i * 75}ms ease`,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Small feature cards */}
            {FEATURES.map(({ Icon, color, title, desc }, i) => (
              <div
                key={title}
                className="fcard rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                style={{
                  opacity: features.on ? 1 : 0,
                  transform: features.on ? "translateY(0)" : "translateY(22px)",
                  transition: `opacity .5s ${(i + 1) * 75}ms ease, transform .5s ${(i + 1) * 75}ms ease`,
                }}
              >
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: `${color}18`, color }}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="mb-1 text-sm font-semibold text-white/90">{title}</p>
                <p className="text-xs leading-relaxed text-white/38">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="relative z-10 mx-auto max-w-2xl px-4 pb-32 text-center">
          <p className="mb-10 text-[11px] font-semibold uppercase tracking-[.18em] text-white/22">
            Como funciona
          </p>

          <div ref={flow.ref} className="relative flex items-start justify-center">
            {/* Animated connector line */}
            {flow.on && (
              <div
                className="absolute left-[12%] right-[12%] top-5 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(10,102,194,.3) 0%, rgba(55,143,233,.6) 50%, rgba(10,102,194,.3) 100%)",
                  transformOrigin: "left",
                  animation: "connectorGrow .9s .1s ease forwards",
                  opacity: 0,
                  animationFillMode: "forwards",
                  animationDelay: ".1s",
                }}
              />
            )}

            {STEPS.map((step, i) => {
              const isLast = i === STEPS.length - 1;
              return (
                <div
                  key={step}
                  className="relative z-10 flex flex-1 flex-col items-center gap-2.5"
                  style={{
                    opacity: flow.on ? 1 : 0,
                    transition: `opacity .4s ${i * 110}ms ease`,
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-[rgb(10,10,12)] text-xs font-bold"
                    style={{
                      borderColor: isLast ? "rgba(10,102,194,.5)" : "rgba(255,255,255,.1)",
                      color: isLast ? "#378FE9" : "rgba(255,255,255,.55)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isLast ? "#378FE9" : "rgba(255,255,255,.45)" }}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="mx-auto max-w-5xl px-4 py-12 grid grid-cols-1 gap-10 sm:grid-cols-2">

            {/* Sobre o projeto */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                Sobre o projeto
              </p>
              <p className="text-sm leading-relaxed text-white/50">
                O CommitPost nasceu da vontade de transformar commits do dia a dia em presença
                profissional no LinkedIn — sem precisar escrever nada do zero. Traz sua própria
                chave de IA, filtra dados sensíveis e publica com revisão antes de qualquer post.
              </p>
              <a
                href="https://github.com/DaviBaechtold/Linkedin-commits-generator"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-light hover:underline"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Ver no GitHub — 100% open source
              </a>
            </div>

            {/* Sobre mim */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
                Sobre mim
              </p>
              <p className="text-sm leading-relaxed text-white/50">
                Sou estudante de Engenharia de Computação e faço software, sites e projetos de
                hardware por hobby e vontade de aprender. Tudo que construo é gratuito e open
                source — acredito que conhecimento cresce quando é compartilhado.
              </p>
              <a
                href="https://davicampos.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-light hover:underline"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                davicampos.dev
              </a>
            </div>

          </div>
          <div className="border-t border-white/[0.05] py-5 text-center text-xs text-white/18">
            CommitPost — geração responsável de conteúdo profissional
          </div>
        </footer>
      </div>
    </>
  );
}
