"use client";

import { useEffect, useState } from "react";
import { Github, Check, Sparkles, Send, ThumbsUp, MessageCircle, Loader2 } from "lucide-react";

const BRAND = "#378FE9";
const STEP_MS = 4800;

const SCENES = [
  { label: "Conectar GitHub" },
  { label: "Adicionar chave" },
  { label: "Gerar com IA" },
  { label: "Publicar" },
];

/** Ponteiro de mouse falso (SVG), animado por keyframes via --tx/--ty. */
function Cursor({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 hidden sm:block"
      style={
        {
          "--tx": `${x}px`,
          "--ty": `${y}px`,
          animation: `hiwCursor 1.5s ${delay}s cubic-bezier(.5,.1,.25,1) both`,
        } as React.CSSProperties
      }
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.5))" }}>
        <path d="M5 3l14 7-6 1.5L9.5 18 5 3z" fill="#fff" stroke="#000" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ClickRing({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <span
      className="pointer-events-none absolute z-20 hidden rounded-full sm:block"
      style={{
        left: x,
        top: y,
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
        border: `2px solid ${BRAND}`,
        animation: `hiwRing .6s ${delay}s ease-out both`,
      }}
    />
  );
}

/** Wrapper que centraliza horizontalmente sem usar transform (livre p/ animar). */
function CenterRow({ top, children }: { top: number; children: React.ReactNode }) {
  return (
    <div className="absolute left-0 right-0 flex justify-center" style={{ top }}>
      {children}
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[320px] w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgb(14,14,18)]">
      <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.06] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="ml-3 text-[11px] font-medium text-white/25">commitpost.app</span>
      </div>
      <div className="relative h-[calc(320px-2.25rem)]">{children}</div>
    </div>
  );
}

// ── Cenas ──────────────────────────────────────────────────────────────────

function SceneGithub() {
  return (
    <>
      <p className="absolute left-6 top-6 text-sm font-semibold text-white/80">Conecte sua conta</p>
      <p className="absolute left-6 top-[3.1rem] text-xs text-white/35">Para ler seus commits e gerar posts.</p>

      <CenterRow top={140}>
        <button
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black"
          style={{ animation: "hiwPreOut .35s 1.55s ease both" }}
        >
          <Github className="h-4 w-4" /> Continuar com GitHub
        </button>
      </CenterRow>
      <CenterRow top={140}>
        <div
          className="flex items-center gap-2.5 rounded-lg border border-green-500/30 bg-green-500/10 px-5 py-2.5 opacity-0"
          style={{ animation: "hiwPostIn .4s 1.7s ease both" }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-3 w-3 text-green-400" />
          </span>
          <span className="text-sm font-medium text-green-300">@DaviBaechtold conectado</span>
        </div>
      </CenterRow>

      <Cursor x={262} y={142} delay={0.3} />
      <ClickRing x={280} y={154} delay={1.55} />
    </>
  );
}

function SceneKey() {
  return (
    <>
      <p className="absolute left-6 top-6 text-sm font-semibold text-white/80">Sua chave de IA</p>
      <p className="absolute left-6 top-[3.1rem] text-xs text-white/35">Você traz a sua — controla uso e custos.</p>

      <div className="absolute left-6 right-6 top-[90px] rounded-lg border border-brand/40 bg-white/5 px-3 py-2.5">
        <span
          className="block overflow-hidden whitespace-nowrap font-mono text-sm text-white/80"
          style={{ width: 0, animation: "hiwType 1.3s .4s steps(20) forwards", borderRight: `1.5px solid ${BRAND}` }}
        >
          AIzaSyD9-xK2q7Vb4PnL
        </span>
      </div>

      <div className="absolute right-6 top-[150px]">
        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          style={{ animation: "hiwPreOut .3s 2.75s ease both" }}
        >
          Salvar chave
        </button>
        <div
          className="absolute inset-0 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 opacity-0"
          style={{ animation: "hiwPostIn .4s 2.9s ease both" }}
        >
          <Check className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-green-300">Salvo</span>
        </div>
      </div>

      <Cursor x={452} y={158} delay={1.7} />
      <ClickRing x={470} y={170} delay={2.85} />
    </>
  );
}

function SceneGenerate() {
  const lines = [
    "Essa semana refatorei o agendador do meu projeto e",
    "mergulhei em cron jobs e fusos horários. Pequenos",
    "ajustes, grande diferença na experiência. 🚀",
  ];
  return (
    <>
      <p className="absolute left-6 top-6 text-sm font-semibold text-white/80">Gerar post</p>

      <CenterRow top={62}>
        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          style={{ animation: "hiwPreOut .3s 1.55s ease both" }}
        >
          <Sparkles className="h-4 w-4" /> Gerar com IA
        </button>
      </CenterRow>
      <CenterRow top={70}>
        <div
          className="flex items-center gap-2 text-sm text-white/50 opacity-0"
          style={{ animation: "hiwFlash .8s 1.7s ease both" }}
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA…
        </div>
      </CenterRow>

      <div className="absolute left-6 right-6 top-[112px] rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        {lines.map((l, i) => (
          <p
            key={i}
            className="text-[13px] leading-relaxed text-white/75 opacity-0"
            style={{ animation: `hiwPostIn .4s ${2.5 + i * 0.3}s ease both` }}
          >
            {l}
          </p>
        ))}
      </div>

      <Cursor x={262} y={64} delay={0.3} />
      <ClickRing x={280} y={76} delay={1.55} />
    </>
  );
}

function SceneShare() {
  return (
    <>
      <CenterRow top={24}>
        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          style={{ animation: "hiwPreOut .3s 1.55s ease both" }}
        >
          <Send className="h-4 w-4" /> Publicar no LinkedIn
        </button>
      </CenterRow>

      <div
        className="absolute left-6 right-6 top-[58px] rounded-xl border border-white/10 bg-[rgb(20,20,26)] p-4 opacity-0 shadow-2xl"
        style={{ animation: "hiwSlideUp .5s 1.7s cubic-bezier(.2,.7,.3,1) both" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-purple-500 text-sm font-bold text-white">D</div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-white/90">Davi Campos</p>
            <p className="text-[11px] text-white/35">Eng. de Computação · agora</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
            <Check className="h-3 w-3" /> Publicado
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/75">
          Essa semana refatorei o agendador do meu projeto e mergulhei em cron jobs e fusos horários. 🚀
        </p>
        <div className="mt-3 flex items-center gap-4 border-t border-white/[0.06] pt-2.5 text-[11px] text-white/40">
          <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> 47</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> 8</span>
        </div>
      </div>

      <Cursor x={262} y={26} delay={0.3} />
      <ClickRing x={280} y={38} delay={1.55} />
    </>
  );
}

const SCENE_VIEWS = [SceneGithub, SceneKey, SceneGenerate, SceneShare];

export default function HowItWorksDemo() {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // auto-avança em loop; setActive manual reinicia o timer naturalmente
  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % SCENES.length), STEP_MS);
    return () => clearTimeout(id);
  }, [active, reduced]);

  const Scene = SCENE_VIEWS[active];

  return (
    <section className="relative z-10 mx-auto max-w-2xl px-4 pb-32">
      <style>{`
        @keyframes hiwCursor {
          0%   { transform: translate(540px,300px); opacity:0 }
          15%  { opacity:1 }
          80%  { transform: translate(var(--tx),var(--ty)) }
          88%  { transform: translate(calc(var(--tx) + 5px), calc(var(--ty) + 5px)) }
          100% { transform: translate(var(--tx),var(--ty)); opacity:1 }
        }
        @keyframes hiwRing {
          0%   { opacity:0; transform: scale(.3) }
          40%  { opacity:.7; transform: scale(1) }
          100% { opacity:0; transform: scale(2.1) }
        }
        @keyframes hiwPreOut { 0%{opacity:1; transform: translateY(0)} 100%{opacity:0; transform: translateY(-6px)} }
        @keyframes hiwPostIn { 0%{opacity:0; transform: translateY(8px)} 100%{opacity:1; transform: translateY(0)} }
        @keyframes hiwType   { to { width: 11.5rem } }
        @keyframes hiwFlash  { 0%,100%{opacity:0} 35%,75%{opacity:1} }
        @keyframes hiwSlideUp{ 0%{opacity:0; transform: translateY(34px) scale(.97)} 100%{opacity:1; transform:none} }
        @keyframes hiwBar    { from{width:0%} to{width:100%} }
      `}</style>

      <p className="mb-10 text-center text-[11px] font-semibold uppercase tracking-[.18em] text-white/22">
        Como funciona
      </p>

      {/* Stepper sincronizado */}
      <div className="relative mb-8 flex items-start justify-center">
        <div className="absolute left-[12%] right-[12%] top-5 h-px bg-white/[0.07]" />
        <div
          className="absolute left-[12%] top-5 h-px transition-all duration-500"
          style={{
            width: `${(active / (SCENES.length - 1)) * 76}%`,
            background: `linear-gradient(90deg, ${BRAND}55, ${BRAND})`,
          }}
        />
        {SCENES.map((s, i) => {
          const isActive = i === active;
          const isDone = i < active;
          return (
            <button
              key={s.label}
              onClick={() => setActive(i)}
              className="relative z-10 flex flex-1 cursor-pointer flex-col items-center gap-2.5"
              aria-label={`Ver etapa ${i + 1}: ${s.label}`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-[rgb(10,10,12)] text-xs font-bold transition-all duration-300"
                style={{
                  borderColor: isActive ? BRAND : isDone ? `${BRAND}55` : "rgba(255,255,255,.1)",
                  color: isActive ? "#fff" : isDone ? BRAND : "rgba(255,255,255,.4)",
                  background: isActive ? BRAND : "rgb(10,10,12)",
                  boxShadow: isActive ? `0 0 0 4px ${BRAND}22` : "none",
                }}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className="text-center text-xs font-medium transition-colors duration-300"
                style={{ color: isActive ? BRAND : "rgba(255,255,255,.4)" }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Palco */}
      <Frame>
        <div key={active} className="absolute inset-0">
          <Scene />
        </div>
      </Frame>

      {/* barra de progresso do passo atual */}
      {!reduced && (
        <div className="mx-auto mt-3 h-0.5 w-full max-w-[560px] overflow-hidden rounded-full bg-white/[0.05]">
          <div
            key={active}
            className="h-full"
            style={{ background: `${BRAND}99`, animation: `hiwBar ${STEP_MS}ms linear forwards` }}
          />
        </div>
      )}
    </section>
  );
}
