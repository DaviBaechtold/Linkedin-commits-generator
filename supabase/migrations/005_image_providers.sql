-- Suporte a múltiplos provedores de imagem

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS image_provider TEXT DEFAULT 'pollinations';

ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('linkedin', 'github', 'gemini', 'openai', 'anthropic', 'deepseek', 'fal'));
