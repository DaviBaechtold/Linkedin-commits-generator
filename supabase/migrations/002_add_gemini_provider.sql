-- Adiciona 'gemini' como provider válido na tabela integrations
-- Usuários trazem sua própria chave Gemini (BYOK — Bring Your Own Key)

ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('linkedin', 'github', 'gemini'));
