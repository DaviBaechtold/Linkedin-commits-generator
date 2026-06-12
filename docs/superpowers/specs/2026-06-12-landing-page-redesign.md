# Landing Page Redesign — 2026-06-12

## Goal
Atualizar a landing page para refletir o fluxo real do produto (BYOK multi-provider, auto-post, sem "upload manual") e melhorar o design com animações e interatividade.

## Layout: Hero Clássico Animado

### Hero
- Badge: "Multi-provider AI · BYOK · 100% Gratuito"
- Headline: "Seus commits viram" + typewriter em loop nos spans ("posts no LinkedIn" / "conteúdo profissional" / "sua presença digital")
- Subtítulo: menciona BYOK, NDA, auto-post
- CTA: "Começar grátis →"
- Background: gradiente radial pulsando via @keyframes

### Features — Bento Grid (6 cards)
- Card grande (col-span 2): BYOK multi-provider — chips animados Gemini / Claude / OpenAI / DeepSeek
- 5 cards menores: Auto-post com agendamento · Revisão antes de publicar · Filtro NDA · Geração de imagens · GitHub OAuth

### Como funciona
- Fluxo horizontal: GitHub → Sua IA → Você revisa → LinkedIn
- Linha conectora que cresce via scaleX ao entrar no viewport

## Animações (zero dependências externas)
- Typewriter: useEffect + setTimeout
- Scroll reveal: Intersection Observer + classe CSS `opacity-0 → opacity-100 translate-y-4 → translate-y-0`
- Gradient pulse: `@keyframes` no globals.css
- Card hover: `hover:-translate-y-1 hover:border-white/20 transition-all`
- Conector "como funciona": `scaleX(0 → 1)` com `transform-origin: left`

## Conteúdo removido
- "GitHub ou upload manual" (não existe)
- "Powered by Gemini AI" (substituído por multi-provider)
- Descrição genérica atual

## Arquivo afetado
`frontend/app/page.tsx` — reescrita completa (server component → client component para typewriter)
