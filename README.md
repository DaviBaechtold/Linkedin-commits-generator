# CommitPost

Transforma seus commits do GitHub em posts profissionais para o LinkedIn — automaticamente, com filtro NDA embutido para nunca expor código, empresa ou cliente.

100% gratuito: você traz sua própria chave de IA.

## Como funciona

1. Conecta sua conta GitHub (OAuth)
2. Seleciona os repositórios que quer monitorar
3. Adiciona sua chave de API de IA (Gemini, Claude, OpenAI ou DeepSeek)
4. Gera um post com IA a partir dos commits recentes
5. Revisa no dashboard e publica direto no LinkedIn — ou ativa o modo automático

## Funcionalidades

- **Multi-provider IA (BYOK)** — conecte Gemini, Anthropic Claude, OpenAI ou DeepSeek com sua própria chave. Você controla o uso e os custos.
- **Seleção de modelo** — escolha qual modelo usar por provider (ex: Claude Haiku, GPT-4o Mini, Gemini 2.5 Flash).
- **Instruções de perfil** — personalize o tom dos posts descrevendo seu perfil profissional para a IA.
- **Posts automáticos** — habilite geração e publicação periódica (diária ou semanal). O post fica visível no dashboard por um período de revisão antes de ser publicado. Cancele ou edite a qualquer momento.
- **Filtro NDA automático** — 6 regras inegociáveis no system prompt: nunca menciona empresa, cliente, código, variáveis, colegas ou arquitetura interna.
- **Imagens** — geração via Pollinations.ai (gratuito, sem key).
- **Excluir rascunhos** — delete qualquer rascunho publicado, descartado ou agendado.
- **Consumo de API** — visualize quantos posts foram gerados hoje, nos últimos 7 dias e no mês.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) — deploy Vercel |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| IA | Gemini · Anthropic Claude · OpenAI · DeepSeek (BYOK) |
| Imagens | Pollinations.ai (gratuito) |
| Publicação | LinkedIn UGC Posts API v2 |
| Auto-post | Vercel Cron Jobs |

## Segurança

- Commits anonimizados: repos aparecem como aliases, nunca o nome real
- System prompt com 6 regras inegociáveis de filtro NDA
- Chaves de IA armazenadas server-side — nunca enviadas ao browser
- Todas as secrets server-only (sem `NEXT_PUBLIC_`)
- RLS em todas as tabelas — cada usuário acessa apenas seus próprios dados
- Cron jobs protegidos por `CRON_SECRET`

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
| `LINKEDIN_CLIENT_SECRET` | Secret do app LinkedIn |
| `CRON_SECRET` | Secret para proteger as rotas de cron (`openssl rand -hex 32`) |

> Chaves de IA são fornecidas pelo usuário no dashboard — não há variável `GEMINI_API_KEY` no servidor.

## Deploy

```bash
cd frontend
vercel
```

Após o deploy:
1. Atualize `NEXT_PUBLIC_APP_URL` nas env vars da Vercel
2. Adicione a URL de produção nos redirect URIs do LinkedIn OAuth
3. Adicione `CRON_SECRET` nas env vars da Vercel

## Banco de dados

As migrations ficam em `supabase/migrations/`. Para aplicar:

```bash
supabase db push
```

## Licença

MIT
