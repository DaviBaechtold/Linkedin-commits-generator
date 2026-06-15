-- 009_notifications.sql
-- Notificações in-app (sininho) para eventos de auto-post.
-- Insert apenas via service role (crons); usuário só lê e marca como lida.

CREATE TABLE public.notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT        NOT NULL
              CHECK (type IN ('auto_post_generated', 'auto_post_published', 'auto_post_failed')),
  title       TEXT        NOT NULL,
  body        TEXT,
  draft_id    UUID        REFERENCES public.drafts(id) ON DELETE SET NULL,
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuário lê apenas as próprias notificações.
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário marca as próprias como lidas (update).
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sem policy de INSERT/DELETE: somente o service role (que ignora RLS) cria/remove.
