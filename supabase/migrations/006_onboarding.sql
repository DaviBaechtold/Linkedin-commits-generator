-- ============================================================
-- 006_onboarding.sql — flag de conclusão do tour de onboarding
-- ============================================================
-- Persiste no banco se o usuário já concluiu/pulou o tour, para que ele
-- NÃO reapareça ao limpar cookies/localStorage. Complementa a heurística
-- "já configurado" (chave de IA + repos) do dashboard.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
