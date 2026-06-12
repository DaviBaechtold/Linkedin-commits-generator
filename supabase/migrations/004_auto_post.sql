-- Auto-post agendado: colunas em user_preferences e drafts

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS auto_post_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_post_frequency TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS auto_post_hour INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS auto_post_grace_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS auto_post_last_generated_at TIMESTAMPTZ;

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
