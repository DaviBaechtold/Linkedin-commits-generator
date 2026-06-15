-- Tom do post e regras NDA personalizadas nas preferências
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS tone_style TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS nda_custom_rules TEXT;

-- Hashtags separadas nos rascunhos
ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS hashtags TEXT[];
