# CommitPost

Transforma seus commits do GitHub em posts profissionais para o LinkedIn — com filtro NDA automático para nunca expor código, empresa ou cliente.

## Como funciona

1. Conecta sua conta GitHub (OAuth)
2. Seleciona os repositórios que quer monitorar
3. Gera um post com IA (Gemini) a partir dos commits recentes
4. Revisa no dashboard e publica direto no LinkedIn

## Stack

- **Frontend**: Next.js 15 (App Router) — deploy Vercel
- **Banco**: Supabase (PostgreSQL + Auth + RLS)
- **IA**: Gemini API (`gemini-3.1-flash-lite-preview`)
- **Imagens**: Pollinations.ai (gratuito)
- **Publicação**: LinkedIn UGC Posts API v2

## Segurança

- Commits anonimizados: repos aparecem como aliases, nunca o nome real
- System prompt com 6 regras inegociáveis de filtro NDA
- Todas as keys secretas server-only (sem `NEXT_PUBLIC_`)
- RLS em todas as tabelas — cada usuário acessa apenas seus próprios dados

## Dev local

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Veja [DEPLOY.md](DEPLOY.md) para instruções completas de deploy.

## Licença

MIT
