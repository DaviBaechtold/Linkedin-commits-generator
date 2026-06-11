# CommitPost — CLAUDE.md

## O que é este projeto

Duas partes independentes:

1. **Pipeline Python (raiz)** — automação local que extrai commits de repos no disco, gera post via Gemini, envia para revisão no Telegram e publica no LinkedIn após aprovação. Roda via cron + systemd.

2. **SaaS Web (`/frontend`)** — Next.js 15 + Supabase + Vercel. Mesma lógica, mas multiusuário: GitHub OAuth para login, GitHub API para commits, dashboard web no lugar do Telegram.

## Stack

| Camada | Python (local) | Web (SaaS) |
|---|---|---|
| Auth | `.env` manual | Supabase Auth (GitHub OAuth) |
| Commits | `git log` local | GitHub API |
| IA | Gemini (`google-genai`) | Gemini (`@google/genai`) |
| Imagens | Pollinations.ai | Pollinations.ai |
| Revisão | Telegram bot | Dashboard Next.js |
| Publicação | LinkedIn UGC API v2 | LinkedIn UGC API v2 |
| Estado | `data/drafts.json` | Supabase PostgreSQL |

## Modelo Gemini

O modelo padrão desta key é `gemini-3.1-flash-lite-preview`.  
`gemini-2.0-flash` tem quota esgotada no free tier — não usar como padrão.

## Estrutura do frontend

```
frontend/
  app/
    (auth)/login/           # login GitHub
    auth/callback/          # OAuth callback, salva provider_token
    dashboard/              # rascunhos + geração
    dashboard/repos/        # gerenciar repos
    dashboard/settings/     # LinkedIn OAuth + preferências
    api/auth/linkedin/      # inicia OAuth LinkedIn
    api/auth/linkedin/callback/  # recebe token LinkedIn
    api/generate/           # GitHub commits → Gemini → rascunho
    api/drafts/[id]/        # update status / delete
    api/drafts/[id]/publish/ # publica no LinkedIn
    api/drafts/[id]/regen/  # regenera texto ou imagem
    api/repos/              # CRUD repos
    api/repos/github/       # lista repos via GitHub API
    api/preferences/        # salva preferências
  lib/
    supabase/generated-types.ts  # gerados com: supabase gen types typescript
    gemini.ts               # NDA filter + retry chain de modelos
    linkedin.ts             # publish + verify token
    github.ts               # listUserRepos + fetchCommits
    rate-limit.ts           # checkRateLimit + logUsage
```

## Banco de dados

Migration em `supabase/migrations/001_initial.sql`.  
Tabelas: `integrations`, `repos`, `drafts`, `usage_logs`, `user_preferences`.  
Todas com RLS por `user_id`.

Regenerar tipos após mudança no schema:
```bash
supabase gen types typescript --project-id rrffgtwcgzgjiwrpuygj > frontend/lib/supabase/generated-types.ts
```

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY`, `LINKEDIN_CLIENT_SECRET`, `GEMINI_API_KEY` — sem `NEXT_PUBLIC_`, nunca expostos ao browser
- LinkedIn OAuth usa state CSRF (cookie httpOnly, 10 min TTL)
- Todos os updates têm `.eq("user_id", user.id)` — ownership sempre verificado
- Rate limiting por usuário via tabela `usage_logs`

## Dev local

```bash
cd frontend
cp .env.local.example .env.local   # preencher keys
npm install
npm run dev                         # http://localhost:3000
```

## Deploy

```bash
cd frontend
vercel                              # segue o wizard
# Após obter a URL de produção:
# 1. Atualizar NEXT_PUBLIC_APP_URL nas env vars da Vercel
# 2. Adicionar URL ao LinkedIn OAuth redirect URIs
```

## Arquivos sensíveis

`frontend/.env.local` — nunca commitar (está no `.gitignore`).  
O `.env` na raiz é do pipeline Python — também nunca commitar.
