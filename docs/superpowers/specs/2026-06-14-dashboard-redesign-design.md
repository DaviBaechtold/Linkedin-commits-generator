# Dashboard Redesign + Tracking — 2026-06-14

## Goal
Deixar o app menos "vazio" e mais interativo, e adicionar acompanhamento de
publicações/engajamento. Hoje cada página mostra só uma coisa, centralizada em
`max-w-3xl`, deixando muito espaço em branco nas laterais.

## Decisões (aprovadas)
- **Layout:** Opção A — banda de stats no topo + coluna lateral fixa à direita.
- **Engajamento:** somente via API do LinkedIn (auto). Sem entrada manual. Se a
  API bloquear, card mostra "—" + link "Ver no LinkedIn".
- **Entrega:** Fase 1 primeiro (revisão em produção), depois Fase 2 e 3.

## Restrição conhecida (LinkedIn API)
A API de membro é restrita. **Impressões/views NÃO existem** para perfil pessoal
(só Páginas de empresa). Curtidas/comentários *podem* vir via
`GET /v2/socialActions/{urn}` com o token do membro, mas é instável. Toda a UI de
engajamento degrada para "—" + link se a API não responder.

---

## Fase 1 — Reestruturação visual (sem dependência externa)

Usa apenas dados que já temos (`drafts`, `usage_logs`). É a fatia de maior
impacto visual e zero risco de API. Entregue e revisada antes do resto.

### Layout do dashboard (`app/dashboard/page.tsx`)
Estrutura nova, largura total (remove o `max-w-3xl` centralizado):
- **Banda de stats** (topo, largura cheia): 4 cards com count-up.
  - Publicados (`drafts.status='posted'`)
  - Pendentes (`status='pending'`)
  - Agendados (`status='scheduled'`)
  - Gerados no mês (`usage_logs action='generate'` desde início do mês)
  - *Nota:* o card de **Engajamento total** (❤+💬) entra na Fase 2, quando os
    dados existem. Na Fase 1 o 4º card é "Gerados no mês".
- **Grid 2 colunas** abaixo: lista (esquerda, ~2fr) + coluna lateral (direita, ~1fr).

### Componentes novos
- `components/StatsBand.tsx` — recebe os contadores, renderiza os 4 cards. Count-up
  via `requestAnimationFrame` (sem lib).
- `components/ActivityChart.tsx` — gráfico de barras SVG puro. Recebe série
  semanal (posts/gerações nas últimas 8 semanas). Barras animam a altura na entrada.
- `components/SideRail.tsx` — engloba ActivityChart + bloco "Insights"
  (repos mais usados, modelo ativo, melhor horário — recomendação fixa nesta fase:
  "Ter–Qui, 8–10h"). Some/colapsa em telas estreitas (`< lg`).
- `components/DraftFilters.tsx` — abas Todos/Pendentes/Publicados/Agendados + busca
  por texto. Estado no cliente; filtra os drafts já carregados.

### Mudanças em componentes existentes
- `DraftList.tsx` — recebe filtro/busca ativos; aplica `.filter()`; empty states
  por filtro ("Nenhum publicado ainda", etc.). Micro-animações: fade+stagger na
  entrada dos cards, hover lift (já parcialmente presente via `.card`).
- `app/dashboard/layout.tsx` — `main` deixa de ser `max-w` apertado; passa a usar
  a largura disponível com padding. (Mantém a checagem de onboarding já existente.)

### Dados (server component)
`dashboard/page.tsx` busca (via cliente do usuário, RLS):
- drafts (já busca) → deriva contadores por status.
- `usage_logs` agregado por semana (8 semanas) para o ActivityChart.
- contagem de generates do mês.
- agregação de `repos_used`/`model_used` dos drafts para os Insights.

### Responsivo
- `lg+`: grid 2 colunas (lista + rail).
- `< lg`: rail vira bloco acima/abaixo da lista (stack), stats viram 2x2.

---

## Fase 2 — Engajamento (API LinkedIn, auto)

### Migração `007_engagement.sql`
```sql
ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS likes_count INT,
  ADD COLUMN IF NOT EXISTS comments_count INT,
  ADD COLUMN IF NOT EXISTS engagement_synced_at TIMESTAMPTZ;
```

### `lib/linkedin.ts`
- `getPostEngagement(token, postUrn)` → `GET /v2/socialActions/{urlencoded urn}`.
  Parseia `likesSummary.totalLikes` e `commentsSummary.aggregatedTotalComments`.
  Retorna `null` em erro/403 (degrada).

### Rota `POST /api/drafts/[id]/engagement`
- Auth + ownership. Lê `linkedin_post_id` do draft + token LinkedIn (decriptado).
- Chama `getPostEngagement`. Se ok, grava `likes_count`, `comments_count`,
  `engagement_synced_at`. Se null, retorna 200 com `synced:false` (UI mostra "—").
- Rate-limited (reusa `usage_logs`/limite leve).

### UI
- Card de post publicado: ❤ `likes_count` · 💬 `comments_count` · botão "Atualizar
  métricas" (spinner) · "Ver no LinkedIn". Se nunca sincronizado ou null → "—".
- Stat "Engajamento total" na banda = soma de likes+comments dos posts.
- Insight "melhor horário" passa a derivar do horário dos posts com mais
  engajamento (fallback para a recomendação fixa se poucos dados).
- Opcional: cron de publish também atualiza engajamento de posts dos últimos ~7 dias.

---

## Fase 3 — Polish final
- **Repos** (`dashboard/repos`): grid de cards 2 colunas (nome, owner, alias,
  toggle enabled, delete) no lugar das linhas largas. Mantém toda a funcionalidade.
- **Insights detalhados**: no card expandido, "Gerado de: [repos] · modelo X".
- **Settings**: refino de espaçamento/consistência (sem mudança funcional).

---

## Fora de escopo (YAGNI)
- Impressões/views do LinkedIn (API não fornece para membro).
- Bibliotecas de chart (gráfico é SVG próprio).
- Entrada manual de engajamento (decisão: só API).
- Analytics de terceiros.

## Arquivos afetados (resumo)
- Novos: `StatsBand.tsx`, `ActivityChart.tsx`, `SideRail.tsx`, `DraftFilters.tsx`,
  `api/drafts/[id]/engagement/route.ts` (F2), `migrations/007_engagement.sql` (F2).
- Alterados: `dashboard/page.tsx`, `dashboard/layout.tsx`, `DraftList.tsx`,
  `lib/linkedin.ts` (F2), `dashboard/repos/page.tsx` + `RepoManager.tsx` (F3).
