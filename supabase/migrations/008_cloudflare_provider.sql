-- ============================================================
-- 008_cloudflare_provider.sql — provider Cloudflare Workers AI
-- ============================================================
-- Cloudflare Workers AI como gerador de imagem grátis (FLUX schnell).
-- Token guardado em access_token (cifrado); account_id em provider_user_id.

ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('linkedin', 'github', 'gemini', 'openai', 'anthropic', 'deepseek', 'fal', 'cloudflare'));
