# Deploy — CommitPost (Vercel + Supabase)

## 1. Supabase

### Criar projeto
1. Acesse [supabase.com](https://supabase.com) → New Project
2. Escolha região mais próxima (ex: `sa-east-1` para Brasil)
3. Anote `Project URL` e `anon key` (Settings → API)

### Configurar Auth (GitHub OAuth)
1. Supabase Dashboard → Authentication → Providers → GitHub → Enable
2. Crie um OAuth App em [github.com/settings/applications/new](https://github.com/settings/applications/new):
   - **Homepage URL**: `https://seu-app.vercel.app`
   - **Callback URL**: `https://xxxx.supabase.co/auth/v1/callback`
3. Cole Client ID e Secret no Supabase

### Rodar as migrations
```bash
# Instale o Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplica as migrations
supabase db push
```

Ou cole manualmente o conteúdo de `supabase/migrations/001_initial.sql` no SQL Editor do dashboard.

---

## 2. LinkedIn App

1. Acesse [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → Create App
2. Associe a uma Company Page (obrigatório pelo LinkedIn)
3. Em **Products**, solicite:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**
4. Em **Auth** → Authorized redirect URLs, adicione:
   - `https://seu-app.vercel.app/api/auth/linkedin/callback`
   - `http://localhost:3000/api/auth/linkedin/callback` (para dev)
5. Copie `Client ID` e `Client Secret`

---

## 3. Gemini API Key

1. Acesse [aistudio.google.com](https://aistudio.google.com/app/apikey) → Create API key
2. O tier gratuito tem limite generoso para uso pessoal

---

## 4. Deploy na Vercel

### Via CLI
```bash
cd frontend
npm install
npx vercel
```

### Via GitHub (recomendado)
1. Faça push do repositório no GitHub
2. [vercel.com](https://vercel.com) → New Project → Import
3. **Root Directory**: `frontend`
4. **Framework**: Next.js (detectado automaticamente)

### Variáveis de ambiente na Vercel
Em Settings → Environment Variables, adicione todas as vars do `.env.local.example`:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
| `NEXT_PUBLIC_APP_URL` | `https://seu-app.vercel.app` |
| `GEMINI_API_KEY` | sua key do Google AI Studio |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `LINKEDIN_CLIENT_ID` | client ID do app LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | client secret do app LinkedIn |
| `DAILY_GENERATE_LIMIT` | `10` |

> `SUPABASE_SERVICE_ROLE_KEY` e `LINKEDIN_CLIENT_SECRET` devem ter escopo **Server** only — nunca marcar como "Expose to browser".

---

## 5. Desenvolvimento local

```bash
cd frontend
cp .env.local.example .env.local
# preencha .env.local com suas keys

npm install
npm run dev
# → http://localhost:3000
```

---

## Segurança — checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca exposta no browser
- [ ] `LINKEDIN_CLIENT_SECRET` nunca exposta no browser
- [ ] `GEMINI_API_KEY` nunca exposta no browser (sem `NEXT_PUBLIC_`)
- [ ] RLS habilitado em todas as tabelas (já na migration)
- [ ] LinkedIn OAuth com state CSRF (já implementado)
- [ ] Rate limiting de gerações por usuário (já implementado)
- [ ] `.env.local` no `.gitignore`
- [ ] Redirect URI do LinkedIn com `https://` em produção

---

## Estrutura de pastas

```
/
├── frontend/          ← Next.js 15 (deploy Vercel)
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── auth/callback/
│   │   ├── dashboard/
│   │   │   ├── repos/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/linkedin/
│   │       ├── generate/
│   │       ├── drafts/[id]/
│   │       ├── repos/
│   │       └── preferences/
│   ├── components/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── gemini.ts
│   │   ├── linkedin.ts
│   │   ├── github.ts
│   │   └── rate-limit.ts
│   └── .env.local.example
└── supabase/
    └── migrations/001_initial.sql
```
