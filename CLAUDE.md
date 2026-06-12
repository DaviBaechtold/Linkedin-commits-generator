# CommitPost — CLAUDE.md

## O que é este projeto

**CommitPost** — SaaS web 100% gratuito que transforma commits do GitHub em posts profissionais para o LinkedIn. O usuário traz sua própria chave de API de IA (BYOK). Filtro NDA automático impede exposição de código, empresa ou cliente.

Stack: Next.js 15 (App Router) + Supabase + Vercel.

## Stack

| Camada | Tecnologia |
|---|---|
| Auth | Supabase Auth (GitHub OAuth) |
| Commits | GitHub API |
| IA (texto) | Multi-provider BYOK: Gemini, Anthropic Claude, OpenAI, DeepSeek |
| Imagens | Pollinations.ai (gratuito, sem key) |
| Revisão | Dashboard Next.js |
| Publicação | LinkedIn UGC API v2 |
| Estado | Supabase PostgreSQL |
| Auto-post | Vercel Cron Jobs |

## Provedores de IA (BYOK)

O usuário salva sua própria chave em `integrations`. O provedor ativo é salvo em `user_preferences.ai_provider`.

| Provider | Prefixo da key | SDK |
|---|---|---|
| Gemini | `AIza` | `@google/genai` |
| Anthropic Claude | `sk-ant-` | `@anthropic-ai/sdk` |
| OpenAI | `sk-` | `openai` |
| DeepSeek | `sk-` | `openai` (baseURL customizada) |

Modelos disponíveis por provider ficam em `frontend/lib/ai-providers.ts` (client-safe).  
A lógica de geração fica em `frontend/lib/ai.ts` (server-only).

Gemini ainda tem fallback chain interno: modelo selecionado → `gemini-3.1-flash-lite-preview` → `gemini-1.5-flash`.

## Estrutura do frontend

```
frontend/
  app/
    (auth)/login/                   # login GitHub
    auth/callback/                  # OAuth callback, salva provider_token
    dashboard/                      # rascunhos + geração
    dashboard/repos/                # gerenciar repos
    dashboard/settings/             # todas as configurações
    api/auth/linkedin/              # inicia OAuth LinkedIn
    api/auth/linkedin/callback/     # recebe token LinkedIn
    api/generate/                   # GitHub commits → IA → rascunho
    api/drafts/[id]/                # PATCH status / DELETE
    api/drafts/[id]/publish/        # publica no LinkedIn
    api/drafts/[id]/regen/          # regenera texto ou imagem
    api/integrations/ai/[provider]/ # PUT/DELETE chave de IA por provider
    api/integrations/gemini/        # (legado) PUT/DELETE chave Gemini
    api/repos/                      # CRUD repos
    api/repos/github/               # lista repos via GitHub API
    api/preferences/                # salva preferências (incluindo auto-post e IA)
    api/account/                    # DELETE conta (LGPD)
    api/cron/generate/              # [CRON] gera posts automáticos para usuários elegíveis
    api/cron/publish/               # [CRON] publica rascunhos agendados vencidos
  components/
    DraftList.tsx    # lista + cards de rascunhos (delete, agendamento, countdown)
    GenerateButton.tsx
    SettingsForm.tsx # toda a UI de configurações (IA, auto-post, preferências)
    RepoManager.tsx
    LogoutButton.tsx
  lib/
    supabase/generated-types.ts  # atualizar com: supabase gen types typescript --project-id rrffgtwcgzgjiwrpuygj > frontend/lib/supabase/generated-types.ts
    supabase/types.ts            # tipos customizados (manter em sync com generated-types)
    ai-providers.ts              # config client-safe: labels, modelos, placeholders por provider
    ai.ts                        # geração unificada (server-only, importa SDKs)
    gemini.ts                    # geração de imagem via Pollinations (manter para compatibilidade)
    linkedin.ts                  # publishPost + verifyToken
    github.ts                    # listUserRepos + fetchCommits
    rate-limit.ts                # checkRateLimit + logUsage
```

## Banco de dados

Migrations em `supabase/migrations/`:
- `001_initial.sql` — tabelas base + RLS
- `002_add_gemini_provider.sql` — constraint integrations
- `003_multi_provider_ai.sql` — `ai_provider`, `ai_model`, `profile_instructions` em `user_preferences`; constraint atualizada para todos os providers
- `004_auto_post.sql` — `auto_post_*` em `user_preferences`; `scheduled_for`, `auto_generated` em `drafts`

Tabelas: `integrations`, `repos`, `drafts`, `usage_logs`, `user_preferences`.  
Todas com RLS por `user_id`.

Aplicar migrations:
```bash
supabase db push
```

Regenerar tipos após mudança no schema:
```bash
supabase gen types typescript --project-id rrffgtwcgzgjiwrpuygj > frontend/lib/supabase/generated-types.ts
```
Após regenerar, também atualizar `frontend/lib/supabase/types.ts` manualmente para manter os tipos customizados em sync.

## Status de rascunhos

| Status | Descrição |
|---|---|
| `pending` | Aguardando revisão manual |
| `scheduled` | Gerado automaticamente, aguardando período de revisão antes de auto-publicar |
| `posted` | Publicado no LinkedIn |
| `discarded` | Descartado pelo usuário |
| `regenerating` | Em regeneração (estado temporário no cliente) |

## Auto-post (Vercel Cron)

- `vercel.json` define dois cron jobs: `/api/cron/generate` (a cada hora) e `/api/cron/publish` (a cada 15 min)
- Ambos verificam `Authorization: Bearer CRON_SECRET` — adicionar `CRON_SECRET` nas env vars da Vercel
- Gerador: verifica usuários com `auto_post_enabled = true` → checa se está na hora certa e se passou o intervalo → gera post com a IA do usuário → cria draft `scheduled` com `scheduled_for = now + grace_hours`
- Publicador: busca drafts `scheduled` com `scheduled_for <= now` → publica no LinkedIn → atualiza para `posted`
- Vercel Hobby plan: mínimo 1/dia. Pro plan: qualquer intervalo.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY`, `LINKEDIN_CLIENT_SECRET`, `CRON_SECRET` — sem `NEXT_PUBLIC_`, nunca expostos ao browser
- Chaves de IA do usuário guardadas em `integrations`, nunca enviadas ao cliente (apenas hint dos últimos 4 chars)
- LinkedIn OAuth usa state CSRF (cookie httpOnly, 10 min TTL)
- Todos os updates têm `.eq("user_id", user.id)` — ownership sempre verificado
- Rate limiting por usuário via tabela `usage_logs`
- Cron routes protegidos por `CRON_SECRET`

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
# 3. Adicionar CRON_SECRET nas env vars da Vercel
```

## Arquivos sensíveis

`frontend/.env.local` — nunca commitar (está no `.gitignore`).
