-- ============================================================
-- 001_initial.sql — Schema completo para LinkedIn Commits SaaS
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ------------------------------------------------------------
-- Integrações OAuth por usuário (GitHub extra + LinkedIn)
-- ------------------------------------------------------------
CREATE TABLE public.integrations (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider        TEXT    NOT NULL CHECK (provider IN ('linkedin', 'github')),
  -- Tokens cifrados em repouso no nível da aplicação (AES-256-GCM, lib/crypto.ts).
  -- Formato: "v1:iv:tag:ct". Valores legados sem prefixo são plaintext (migração transparente).
  access_token    TEXT    NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  -- LinkedIn: "urn:li:person:XXX" | GitHub: login do usuário
  provider_user_id TEXT,
  provider_username TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ------------------------------------------------------------
-- Repositórios conectados por usuário
-- ------------------------------------------------------------
CREATE TABLE public.repos (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- GitHub: "owner/repo" (ex: "davibaechtold/meu-projeto")
  github_full_name TEXT,
  -- Para upload manual de git log (sem GitHub OAuth)
  display_name TEXT NOT NULL,
  -- Alias público que aparece nos posts (nunca o nome real)
  alias       TEXT NOT NULL,
  enabled     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Rascunhos gerados
-- ------------------------------------------------------------
CREATE TABLE public.drafts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_text       TEXT    NOT NULL,
  -- Resumo dos commits usado para regenerar sem re-buscar
  raw_log_summary TEXT,
  -- Array de objetos: [{url: string, mime_type: string}]
  visual_assets   JSONB   DEFAULT '[]'::jsonb,
  status          TEXT    DEFAULT 'pending'
                  CHECK (status IN ('pending','posted','discarded','regenerating')),
  linkedin_post_id TEXT,
  -- Metadados de geração
  repos_used      TEXT[], -- aliases dos repos incluídos
  model_used      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Log de uso para rate limiting
-- ------------------------------------------------------------
CREATE TABLE public.usage_logs (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action      TEXT    NOT NULL CHECK (action IN ('generate','publish','regen_text','regen_image')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Preferências do usuário
-- ------------------------------------------------------------
CREATE TABLE public.user_preferences (
  user_id         UUID    REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  post_language   TEXT    DEFAULT 'pt-BR',
  enable_images   BOOLEAN DEFAULT TRUE,
  image_style     TEXT    DEFAULT 'professional',
  -- Quantos dias de commits buscar na geração
  commits_since_days INT  DEFAULT 30,
  -- Máximo de gerações por dia permitidas pelo usuário (sobrepõe limite global se menor)
  daily_limit     INT     DEFAULT 10,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Trigger: atualiza updated_at automaticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_drafts_updated_at
  BEFORE UPDATE ON public.drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cria preferências padrão ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------
-- Row Level Security — nenhuma linha vaza entre usuários
-- ------------------------------------------------------------
ALTER TABLE public.integrations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences  ENABLE ROW LEVEL SECURITY;

-- Integrations
CREATE POLICY "integrations: user sees own" ON public.integrations
  FOR ALL USING (auth.uid() = user_id);

-- Repos
CREATE POLICY "repos: user sees own" ON public.repos
  FOR ALL USING (auth.uid() = user_id);

-- Drafts
CREATE POLICY "drafts: user sees own" ON public.drafts
  FOR ALL USING (auth.uid() = user_id);

-- Usage logs (somente leitura para o próprio usuário; escrita via service_role nas API routes)
CREATE POLICY "usage_logs: user reads own" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Preferences
CREATE POLICY "preferences: user sees own" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Índices para performance
-- ------------------------------------------------------------
CREATE INDEX idx_drafts_user_status    ON public.drafts (user_id, status);
CREATE INDEX idx_drafts_user_created   ON public.drafts (user_id, created_at DESC);
CREATE INDEX idx_usage_logs_user_date  ON public.usage_logs (user_id, created_at DESC);
CREATE INDEX idx_repos_user_enabled    ON public.repos (user_id, enabled);
