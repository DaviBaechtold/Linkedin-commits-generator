# CommitPost — CLAUDE.md

## O que é este projeto

**CommitPost** — SaaS web 100% gratuito que transforma commits do GitHub em posts profissionais para o LinkedIn. O usuário traz sua própria chave de API de IA (BYOK). Filtro NDA automático impede exposição de código, empresa ou cliente.

Stack: Next.js 15 (App Router) + Supabase + Vercel.

## Stack

| Camada | Tecnologia |
|---|---|
| Auth | Supabase Auth (GitHub OAuth) |
| Commits | GitHub API |
| IA (texto) | Multi-provider BYOK: Gemini, Anthropic Claude, OpenAI, DeepSeek, Groq, Mistral, xAI |
| Imagens | Cloudflare Workers AI (grátis) · DALL·E 3 · Fal.ai FLUX |
| Revisão | Dashboard Next.js |
| Publicação | LinkedIn UGC API v2 · Bluesky AT Protocol |
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
| Groq | `gsk_` | `openai` (baseURL customizada) |
| Mistral | qualquer | `@mistralai/mistralai` |
| xAI | `xai-` | `openai` (baseURL customizada) |

Modelos disponíveis por provider ficam em `frontend/lib/ai-providers.ts` (client-safe).  
A lógica de geração fica em `frontend/lib/ai.ts` (server-only).

Gemini ainda tem fallback chain interno: modelo selecionado → `gemini-3.1-flash-lite-preview` → `gemini-1.5-flash`.

## Provedores de imagem

| Provider | Chave necessária | Notas |
|---|---|---|
| Cloudflare Workers AI | Token + Account ID em `integrations` | FLUX schnell, gratuito (~dezenas/dia) |
| DALL·E 3 | Usa chave OpenAI já salva | Pago, alta qualidade |
| Fal.ai FLUX | Chave própria em `integrations` | Pago, alta qualidade |

## Estrutura do frontend

```
frontend/
  app/
    (auth)/login/                    # login GitHub
    auth/callback/                   # OAuth callback, salva provider_token
    dashboard/                       # rascunhos + geração
    dashboard/repos/                 # gerenciar repos
    dashboard/settings/              # todas as configurações
    api/auth/linkedin/               # inicia OAuth LinkedIn
    api/auth/linkedin/callback/      # recebe token LinkedIn
    api/generate/                    # GitHub commits → IA → rascunho
    api/drafts/[id]/                 # PATCH status/scheduled_for/hashtags/post_text / DELETE
    api/drafts/[id]/publish/         # publica no LinkedIn
    api/drafts/[id]/publish-bluesky/ # publica no Bluesky (trunca para 300 grafemas)
    api/drafts/[id]/regen/           # regenera texto ou imagem
    api/drafts/[id]/image/           # POST (upload/compress) / DELETE imagem
    api/drafts/[id]/engagement/      # POST sincroniza likes/comments do LinkedIn
    api/integrations/ai/[provider]/  # PUT/DELETE chave de IA por provider
    api/integrations/bluesky/        # PUT/DELETE integração Bluesky
    api/repos/                       # CRUD repos
    api/repos/[id]/                  # PATCH enabled/alias / DELETE
    api/repos/github/                # lista repos via GitHub API
    api/preferences/                 # salva preferências (incluindo auto-post, tom, NDA)
    api/account/                     # DELETE conta (LGPD)
    api/cron/generate/               # [CRON] gera posts automáticos para usuários elegíveis
    api/cron/publish/                # [CRON] publica rascunhos agendados vencidos
  components/
    DraftList.tsx       # lista + cards de rascunhos; hashtag chips; lightbox; preview modal; agendamento; Bluesky
    GenerateButton.tsx  # botão gerar post com feedback de loading/erro
    PostPreviewModal.tsx # preview estilo LinkedIn (avatar, texto, imagem, barra de ações)
    SettingsForm.tsx    # configurações em grupos (Integrações · IA · Automação · Preferências · Danger Zone)
    RepoManager.tsx     # gestão de repos; link GitHub clicável; badge ativo/inativo
    StatsBand.tsx       # banda de stats (publicados, pendentes, agendados, gerados no mês, engajamento)
    SideRail.tsx        # coluna lateral (atividade, top repos, modelo ativo)
    DraftFilters.tsx    # filtros + busca nos rascunhos
    LogoutButton.tsx
  lib/
    supabase/generated-types.ts  # atualizar com: supabase gen types typescript --project-id rrffgtwcgzgjiwrpuygj > frontend/lib/supabase/generated-types.ts
    supabase/types.ts            # tipos customizados (manter em sync com generated-types)
    ai-providers.ts              # config client-safe: labels, modelos, placeholders, TONE_OPTIONS por provider
    ai.ts                        # geração unificada (server-only, importa SDKs)
    image-providers.ts           # config dos provedores de imagem
    gemini.ts                    # geração de imagem via Pollinations (legado, mantido por compatibilidade)
    linkedin.ts                  # publishPost + verifyToken
    github.ts                    # listUserRepos + fetchCommits
    rate-limit.ts                # checkRateLimit + logUsage
    crypto.ts                    # encryptToken / decryptToken (AES-256-GCM)
```

## Banco de dados

Migrations em `supabase/migrations/`:
- `001_initial.sql` — tabelas base + RLS
- `002_add_gemini_provider.sql` — constraint integrations
- `003_multi_provider_ai.sql` — `ai_provider`, `ai_model`, `profile_instructions` em `user_preferences`
- `004_auto_post.sql` — `auto_post_*` em `user_preferences`; `scheduled_for`, `auto_generated` em `drafts`
- `005_hashtags.sql` — coluna `hashtags text[]` em `drafts`
- `006_tone_nda.sql` — `tone_style`, `nda_custom_rules` em `user_preferences`
- `007_engagement.sql` — `likes_count`, `comments_count`, `engagement_synced_at` em `drafts`
- `008_image_upload.sql` — suporte a upload de imagem (Supabase Storage)
- `009_groq_mistral_xai.sql` — providers adicionais na constraint integrations
- `010_fal_cloudflare.sql` — providers de imagem na constraint integrations
- `011_image_provider.sql` — `image_provider` em `user_preferences`
- `012_bluesky.sql` — provider bluesky na constraint integrations

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
| `regenerating` | Em regeneração (estado temporário no cliente — não persiste no banco) |

## Funcionalidades do card de rascunho (DraftList)

- **Hashtag chips** — gerencia hashtags independentemente; chip remove tag do `post_text` e da coluna `hashtags`; adicionar appenda no `post_text` + salva em `hashtags`
- **Lightbox** — clicar na imagem abre overlay modal, sem abrir nova aba
- **Preview LinkedIn** — botão olho abre `PostPreviewModal` com layout idêntico ao LinkedIn
- **Edição inline** — textarea com contador de caracteres (limite 3000)
- **Regenerar texto** — chama `/api/drafts/[id]/regen` com `{ type: "text" }`
- **Imagem** — upload com compressão client-side (max 1600px, JPEG 85%); paste via Ctrl+V; geração com IA; remoção
- **Agendamento manual** — painel datetime-local; PATCH com `scheduled_for` seta status `scheduled` automaticamente
- **Publicar no Bluesky** — trunca para 290 grafemas se necessário; requer integração ativa
- **Engajamento** — sincroniza likes/comments do LinkedIn nos posts publicados
- **Insights de geração** — exibe até 3 repos usados + modelo; restante como "+N mais"
- **Novos rascunhos** — sincroniza via `useEffect` sem reload quando `initialDrafts` muda após `router.refresh()`

## Configurações (SettingsForm) — grupos visuais

1. **Integrações** — LinkedIn OAuth · Bluesky (App Password, via AT Protocol)
2. **Inteligência Artificial** — chaves por provider (tabs) · provedor ativo · modelo · instruções de perfil · tom do post (5 opções) · filtro NDA personalizado
3. **Automação** — auto-post (frequência, horário UTC, período de revisão) · geração de imagens (provedor + chave)
4. **Preferências** — idioma dos posts · commits dos últimos N dias · consumo de API
5. **Zona de Perigo** — exclusão permanente de conta (LGPD), isolada com borda vermelha

## Repositórios (RepoManager)

- Toggle ativo/inativo com badge colorido
- Link clicável para o GitHub (abre em nova aba)
- Campo "Nome público nos posts" (alias, salvo ao perder foco)
- Importação individual ou "Importar todos" do GitHub

## Landing page (app/page.tsx)

- Hero com texto ciclante animado
- Seção de features (bento grid)
- Fluxo "Como funciona" (4 etapas com linha conectora)
- Rodapé com duas colunas: **Sobre o projeto** (link GitHub) · **Sobre mim** (estudante de Engenharia de Computação, projetos gratuitos/open source, link davicampos.dev)

## Auto-post (Vercel Cron)

- `vercel.json` define dois cron jobs: `/api/cron/generate` (a cada hora) e `/api/cron/publish` (a cada 15 min)
- Ambos verificam `Authorization: Bearer CRON_SECRET`
- Gerador: verifica usuários com `auto_post_enabled = true` → checa intervalo → gera → cria draft `scheduled` com `scheduled_for = now + grace_hours`
- Publicador: busca drafts `scheduled` com `scheduled_for <= now` → publica → atualiza para `posted`
- Vercel Hobby plan: mínimo 1/dia. Pro plan: qualquer intervalo.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY`, `LINKEDIN_CLIENT_SECRET`, `CRON_SECRET` — sem `NEXT_PUBLIC_`, nunca expostos ao browser
- Chaves de IA e tokens Bluesky guardados em `integrations` criptografados (AES-256-GCM via `crypto.ts`), nunca enviados ao cliente (apenas hint: últimos 4 chars da chave decifrada, ou `@handle` para Bluesky)
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

Branch `prod` → push aciona deploy automático no Vercel via integração GitHub.

```bash
git checkout prod && git merge main && git push origin prod
```

Após o primeiro deploy:
1. Atualizar `NEXT_PUBLIC_APP_URL` nas env vars da Vercel
2. Adicionar URL ao LinkedIn OAuth redirect URIs
3. Adicionar `CRON_SECRET` nas env vars da Vercel

## Arquivos sensíveis

`frontend/.env.local` — nunca commitar (está no `.gitignore`).
