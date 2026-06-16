# CommitPost

Transforma seus commits do GitHub em posts profissionais para o LinkedIn e Bluesky — automaticamente, com filtro NDA embutido para nunca expor código, empresa ou cliente.

100% gratuito e open source: você traz sua própria chave de IA.

## Como funciona

1. Conecta sua conta GitHub (OAuth)
2. Seleciona os repositórios que quer monitorar
3. Adiciona sua chave de API de IA (Gemini, Claude, OpenAI, DeepSeek, Groq, Mistral ou xAI)
4. Gera um post com IA a partir dos commits recentes
5. Revisa no dashboard e publica no LinkedIn ou Bluesky — ou ativa o modo automático

## Funcionalidades

### Geração de conteúdo
- **Multi-provider IA (BYOK)** — Gemini, Anthropic Claude, OpenAI, DeepSeek, Groq, Mistral, xAI. Você controla o uso e os custos.
- **Seleção de modelo** — escolha o modelo por provider (ex: Claude Haiku, GPT-4o Mini, Gemini 2.5 Flash, Llama 3.3 via Groq).
- **Tom do post** — 5 opções: Profissional, Casual, Técnico, Inspirador, Educativo.
- **Instruções de perfil** — descreva seu perfil para personalizar os posts.
- **Filtro NDA automático** — nunca menciona empresa, cliente, código, variáveis, colegas ou arquitetura interna. Regras customizadas adicionais configuráveis.
- **Hashtag chips** — edite, adicione e remova hashtags diretamente no card de rascunho.

### Publicação
- **LinkedIn** — publicação via UGC Posts API v2 com OAuth dedicado.
- **Bluesky** — publicação via AT Protocol (App Password); texto truncado a 290 grafemas automaticamente.
- **Preview** — visualize o post no estilo LinkedIn antes de publicar.
- **Engajamento** — sincronize likes e comentários de posts publicados no LinkedIn.

### Imagens
- **Upload** — arraste ou cole (Ctrl+V) com compressão automática client-side (max 1600px, JPEG 85%).
- **Geração por IA** — Cloudflare Workers AI (grátis, sem key extra), DALL·E 3 (usa chave OpenAI), Fal.ai FLUX.

### Agendamento
- **Manual** — defina data e hora para publicação futura diretamente no card.
- **Auto-post** — habilite geração e publicação periódica. O post fica no dashboard por um período de revisão antes de publicar. Cancele ou edite a qualquer momento.

### Dashboard
- **Cards de rascunho** — edição inline, lightbox de imagem, painel de agendamento com countdown.
- **Estatísticas** — publicados, pendentes, agendados, gerados no mês, engajamento total.
- **Atividade** — histórico de publicações, top repos, modelo ativo.
- **Filtros** — filtre por status (pendente, agendado, publicado, descartado) ou busque pelo texto.

### Repositórios
- Importe do GitHub (individual ou todos de uma vez) ou adicione manualmente.
- Toggle ativo/inativo, alias público para os posts, link para o GitHub.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) — deploy Vercel |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| IA — texto | Gemini · Claude · OpenAI · DeepSeek · Groq · Mistral · xAI (BYOK) |
| IA — imagens | Cloudflare Workers AI · DALL·E 3 · Fal.ai FLUX |
| Publicação | LinkedIn UGC API v2 · Bluesky AT Protocol |
| Auto-post | Vercel Cron Jobs |

## Segurança

- Chaves de IA e App Password Bluesky criptografados server-side (AES-256-GCM) — nunca enviados ao browser
- Repos aparecem como aliases configuráveis, nunca o nome real
- Filtro NDA no system prompt com regras inegociáveis + regras customizadas por usuário
- Todas as secrets sem `NEXT_PUBLIC_` — server-only
- RLS em todas as tabelas — cada usuário acessa apenas seus próprios dados
- LinkedIn OAuth com state CSRF (cookie httpOnly, 10 min TTL)
- Cron jobs protegidos por `CRON_SECRET`
- Rate limiting via tabela `usage_logs`

## Dev local

```bash
cd frontend
cp .env.local.example .env.local   # preencher keys
npm install
npm run dev                         # http://localhost:3000
```

Variáveis necessárias em `.env.local`:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (ex: `http://localhost:3000`) |
| `LINKEDIN_CLIENT_ID` | ID do app LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | Secret do app LinkedIn (server-only) |
| `CRON_SECRET` | Secret para proteger as rotas de cron (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Chave AES-256 para criptografar tokens (32 bytes hex) |

> Chaves de IA são fornecidas pelo usuário no dashboard — não há variável de IA no servidor.

## Deploy

O deploy é feito via branch `prod` — a Vercel monitora automaticamente via integração GitHub:

```bash
git checkout prod && git merge main && git push origin prod
```

Após o primeiro deploy:
1. Atualize `NEXT_PUBLIC_APP_URL` nas env vars da Vercel
2. Adicione a URL de produção nos redirect URIs do LinkedIn OAuth
3. Adicione `CRON_SECRET` e `ENCRYPTION_KEY` nas env vars da Vercel

## Banco de dados

Migrations em `supabase/migrations/`. Para aplicar:

```bash
supabase db push
```

Para regenerar os tipos após mudanças no schema:

```bash
supabase gen types typescript --project-id <project-id> > frontend/lib/supabase/generated-types.ts
```

## Licença

MIT
