# Notificações in-app de auto-post — Design

**Data:** 2026-06-15
**Status:** Aprovado

## Problema

Quando o usuário ativa o auto-post, o cron gera posts sozinho e (se houver LinkedIn)
publica após um período de revisão (grace period). Hoje o usuário não fica sabendo
que há um post aguardando revisão nem que algo foi publicado/falhou. Ele só descobre
abrindo o app por acaso — podendo perder a janela de revisão.

## Objetivo

Sistema de **notificações in-app (sininho)** que avisa o usuário sobre os eventos do
auto-post. Zero serviço externo, zero custo. Canal único: in-app.

## Não-objetivos (YAGNI)

- Email / browser push
- Preferências de quais notificações receber (liga/desliga por tipo)
- Realtime via Supabase (cron roda 1×/dia no Hobby — poll/refetch basta)

## Modelo de dados

Migration `supabase/migrations/009_notifications.sql`:

```
notifications
  id          uuid pk default gen_random_uuid()
  user_id     uuid → auth.users(id) on delete cascade, not null
  type        text not null check in
                ('auto_post_generated','auto_post_published','auto_post_failed')
  title       text not null
  body        text
  draft_id    uuid → drafts(id) on delete set null   -- nullable
  read        boolean not null default false
  created_at  timestamptz not null default now()
```

Índice: `(user_id, read, created_at desc)`.

**RLS:**
- `select` própria: `auth.uid() = user_id`
- `update` própria (marcar como lida): `auth.uid() = user_id`
- **Sem policy de insert** → só o service role (crons) cria notificações. O cliente
  nunca insere.

## Componentes

### `lib/notifications.ts` (server-only)
`notify(service, userId, type, title, body?, draftId?)` — faz o insert.
**Best-effort:** try/catch interno; se falhar, loga e segue. Nunca quebra o cron.

### Pontos de gatilho (dentro dos try/catch existentes)

| Cron | Local | Tipo | Mensagem |
|---|---|---|---|
| `generate` | após `drafts.insert` ok | `auto_post_generated` | "Post automático gerado" / corpo com janela de revisão; `draft_id` setado |
| `generate` | `catch` | `auto_post_failed` | "Falha ao gerar post automático" |
| `publish` | após `status: posted` | `auto_post_published` | "Post automático publicado no LinkedIn"; `draft_id` setado |
| `publish` | LinkedIn ausente/expirado (demote→pending) | `auto_post_failed` | "Não publiquei: reconecte seu LinkedIn" |
| `publish` | `catch` | `auto_post_failed` | "Falha ao publicar post automático" |

Quando `auto_post_generated` é disparado sem LinkedIn (status `pending`), o corpo diz
"aguardando revisão manual" em vez de citar a janela de auto-publicação.

### API

- `GET /api/notifications` → `{ notifications: [...20], unreadCount }`. Auth do usuário,
  `.eq("user_id", user.id)`.
- `POST /api/notifications/read` → marca todas como lidas; aceita `{ id }` opcional para
  marcar uma só. Auth + `.eq("user_id", user.id)`.

### UI — `components/NotificationBell.tsx` (client)

Sino com badge de contador, na linha do logo da sidebar (`dashboard/layout.tsx`).
- Busca ao montar e ao abrir o dropdown. **Sem poll** (cron 1×/dia no Hobby).
- Dropdown: ícone por tipo, título, corpo, "há X". Clique marca como lida e leva ao
  dashboard (`draft_id` quando houver). Botão "marcar todas como lidas".

## Segurança

- Insert só via service role; cliente sem policy de insert.
- Todas as queries de cliente filtram `.eq("user_id", user.id)` + RLS.
- Helper `notify` é best-effort e isolado por try/catch — não afeta o fluxo do cron.
