-- Adiciona suporte a múltiplos provedores de IA (BYOK)
-- Providers suportados: gemini, openai, anthropic, deepseek

ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('linkedin', 'github', 'gemini', 'openai', 'anthropic', 'deepseek'));

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini-3.1-flash-lite-preview',
  ADD COLUMN IF NOT EXISTS profile_instructions TEXT;
