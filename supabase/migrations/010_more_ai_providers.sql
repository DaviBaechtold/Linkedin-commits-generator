-- Adiciona groq, mistral, xai ao constraint de integrations
ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'linkedin', 'github',
    'gemini', 'openai', 'anthropic', 'deepseek',
    'groq', 'mistral', 'xai',
    'fal', 'cloudflare'
  ));
