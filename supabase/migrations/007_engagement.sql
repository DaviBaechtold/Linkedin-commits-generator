-- ============================================================
-- 007_engagement.sql — métricas de engajamento por post
-- ============================================================
-- Armazena curtidas/comentários puxados da API do LinkedIn (socialActions).
-- Impressões NÃO existem para perfil pessoal na API — só curtidas/comentários,
-- e mesmo esses são best-effort (a API pode bloquear → ficam null).

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS likes_count INT,
  ADD COLUMN IF NOT EXISTS comments_count INT,
  ADD COLUMN IF NOT EXISTS engagement_synced_at TIMESTAMPTZ;
