"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPreferences } from "@/lib/supabase/types";
import { PROVIDERS, AI_PROVIDERS, getDefaultModel, type AIProvider } from "@/lib/ai-providers";
import {
  Linkedin,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  Key,
  ExternalLink,
  BarChart2,
  Zap,
} from "lucide-react";

interface Props {
  preferences: UserPreferences | null;
  linkedinConnected: boolean;
  linkedinExpiry: string | null;
  linkedinUsername: string | null;
  aiKeyHints: Record<string, string | null>;
  usageStats: { today: number; week: number; month: number };
}

export default function SettingsForm({
  preferences,
  linkedinConnected,
  linkedinExpiry,
  linkedinUsername,
  aiKeyHints,
  usageStats,
}: Props) {
  const router = useRouter();

  // General preferences
  const [prefs, setPrefs] = useState({
    post_language: preferences?.post_language ?? "pt-BR",
    enable_images: preferences?.enable_images ?? true,
    image_style: preferences?.image_style ?? "professional",
    commits_since_days: preferences?.commits_since_days ?? 30,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI preferences
  const initialProvider = (preferences?.ai_provider as AIProvider) ?? "gemini";
  const [aiPrefs, setAiPrefs] = useState({
    ai_provider: initialProvider,
    ai_model: (preferences?.ai_model as string) ?? getDefaultModel(initialProvider),
    profile_instructions: preferences?.profile_instructions ?? "",
  });
  const [aiPrefsSaving, setAiPrefsSaving] = useState(false);
  const [aiPrefsSaved, setAiPrefsSaved] = useState(false);

  // Per-provider key management
  const [activeTab, setActiveTab] = useState<AIProvider>(initialProvider);
  const [keyInputs, setKeyInputs] = useState<Record<AIProvider, string>>({
    gemini: "",
    anthropic: "",
    openai: "",
    deepseek: "",
  });
  const [keySaving, setKeySaving] = useState<Record<AIProvider, boolean>>({
    gemini: false,
    anthropic: false,
    openai: false,
    deepseek: false,
  });
  const [keyHints, setKeyHints] = useState<Record<AIProvider, string | null>>({
    gemini: aiKeyHints["gemini"] ?? null,
    anthropic: aiKeyHints["anthropic"] ?? null,
    openai: aiKeyHints["openai"] ?? null,
    deepseek: aiKeyHints["deepseek"] ?? null,
  });
  const [keyErrors, setKeyErrors] = useState<Record<AIProvider, string | null>>({
    gemini: null,
    anthropic: null,
    openai: null,
    deepseek: null,
  });

  // Auto-post
  const [autoPost, setAutoPost] = useState({
    auto_post_enabled: preferences?.auto_post_enabled ?? false,
    auto_post_frequency: preferences?.auto_post_frequency ?? "weekly",
    auto_post_hour: preferences?.auto_post_hour ?? 9,
    auto_post_grace_hours: preferences?.auto_post_grace_hours ?? 2,
  });
  const [autoPostSaving, setAutoPostSaving] = useState(false);
  const [autoPostSaved, setAutoPostSaved] = useState(false);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const linkedinExpired = linkedinExpiry && new Date(linkedinExpiry) < new Date();

  async function savePreferences() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function saveAiPrefs() {
    setAiPrefsSaving(true);
    setAiPrefsSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPrefs),
      });
      if (res.ok) setAiPrefsSaved(true);
    } finally {
      setAiPrefsSaving(false);
    }
  }

  function connectLinkedIn() {
    window.location.href = "/api/auth/linkedin";
  }

  async function saveKey(provider: AIProvider) {
    const key = keyInputs[provider].trim();
    if (!key) return;

    setKeySaving((s) => ({ ...s, [provider]: true }));
    setKeyErrors((e) => ({ ...e, [provider]: null }));

    try {
      const res = await fetch(`/api/integrations/ai/${provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key }),
      });
      const json = await res.json();
      if (!res.ok) {
        setKeyErrors((e) => ({ ...e, [provider]: json.error ?? "Falha ao salvar chave." }));
        return;
      }
      setKeyHints((h) => ({ ...h, [provider]: `...${key.slice(-4)}` }));
      setKeyInputs((i) => ({ ...i, [provider]: "" }));
    } finally {
      setKeySaving((s) => ({ ...s, [provider]: false }));
    }
  }

  async function removeKey(provider: AIProvider) {
    setKeySaving((s) => ({ ...s, [provider]: true }));
    try {
      await fetch(`/api/integrations/ai/${provider}`, { method: "DELETE" });
      setKeyHints((h) => ({ ...h, [provider]: null }));
      // If active provider key was removed, reset to gemini
      if (aiPrefs.ai_provider === provider) {
        setAiPrefs((p) => ({
          ...p,
          ai_provider: "gemini",
          ai_model: getDefaultModel("gemini"),
        }));
      }
    } finally {
      setKeySaving((s) => ({ ...s, [provider]: false }));
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json.error ?? "Falha ao excluir conta.");
        return;
      }
      router.push("/login");
    } catch {
      setDeleteError("Erro de conexão. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  async function saveAutoPost() {
    setAutoPostSaving(true);
    setAutoPostSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(autoPost),
      });
      if (res.ok) setAutoPostSaved(true);
    } finally {
      setAutoPostSaving(false);
    }
  }

  const connectedProviders = AI_PROVIDERS.filter((p) => !!keyHints[p]);
  const activeProviderInfo = PROVIDERS[aiPrefs.ai_provider as AIProvider];

  return (
    <div className="flex flex-col gap-6">
      {/* LinkedIn */}
      <section className="card">
        <h2 className="mb-4 text-sm font-semibold text-white/80">Integração LinkedIn</h2>
        {linkedinConnected && !linkedinExpired ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-white/80">Conectado</p>
                {linkedinUsername && (
                  <p className="text-xs text-white/30">{linkedinUsername}</p>
                )}
                {linkedinExpiry && (
                  <p className="text-xs text-white/25">
                    Expira em {new Date(linkedinExpiry).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <button onClick={connectLinkedIn} className="btn-ghost">
              Reconectar
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {linkedinExpired && (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            )}
            <div className="flex-1">
              <p className="text-sm text-white/60">
                {linkedinExpired
                  ? "Token expirado — reconecte para continuar publicando."
                  : "Conecte seu LinkedIn para publicar posts diretamente."}
              </p>
              <button onClick={connectLinkedIn} className="btn-primary mt-3">
                <Linkedin className="h-4 w-4" />
                Conectar LinkedIn
              </button>
            </div>
          </div>
        )}
      </section>

      {/* AI Keys */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-brand-light" />
          <h2 className="text-sm font-semibold text-white/80">Chaves de API</h2>
        </div>
        <p className="text-xs text-white/40">
          O CommitPost usa sua própria chave — você controla o uso e os custos.
        </p>

        {/* Provider tabs */}
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`relative flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                activeTab === p
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {PROVIDERS[p].label.split(" ")[0]}
              {keyHints[p] && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-400" />
              )}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        {AI_PROVIDERS.map((p) =>
          activeTab !== p ? null : (
            <div key={p} className="flex flex-col gap-3">
              {keyHints[p] ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-sm text-white/80">Conectado</p>
                      <p className="font-mono text-xs text-white/30">{keyHints[p]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeKey(p)}
                    disabled={keySaving[p]}
                    className="btn-ghost"
                  >
                    {keySaving[p] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {keyErrors[p] && (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                      {keyErrors[p]}
                    </p>
                  )}
                  <input
                    type="password"
                    className="input"
                    value={keyInputs[p]}
                    onChange={(e) =>
                      setKeyInputs((i) => ({ ...i, [p]: e.target.value }))
                    }
                    placeholder={PROVIDERS[p].keyPlaceholder}
                    autoComplete="off"
                    onKeyDown={(e) => e.key === "Enter" && saveKey(p)}
                  />
                  <div className="flex items-center justify-between">
                    <a
                      href={PROVIDERS[p].keyLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-brand-light hover:underline"
                    >
                      {PROVIDERS[p].keyLinkLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => saveKey(p)}
                      disabled={keySaving[p] || !keyInputs[p].trim()}
                      className="btn-primary"
                    >
                      {keySaving[p] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                      Salvar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </section>

      {/* AI config: active provider + model + profile instructions */}
      <section className="card flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-white/80">Configuração de IA</h2>

        <div>
          <label className="label">Provedor ativo</label>
          <select
            className="input"
            value={aiPrefs.ai_provider}
            onChange={(e) => {
              const prov = e.target.value as AIProvider;
              setAiPrefs((a) => ({
                ...a,
                ai_provider: prov,
                ai_model: getDefaultModel(prov),
              }));
            }}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p} value={p} disabled={!keyHints[p]}>
                {PROVIDERS[p].label}
                {!keyHints[p] ? " (sem chave)" : ""}
              </option>
            ))}
          </select>
          {!keyHints[aiPrefs.ai_provider as AIProvider] && (
            <p className="mt-1 text-xs text-yellow-400/70">
              Adicione a chave de API deste provedor acima para usá-lo.
            </p>
          )}
        </div>

        <div>
          <label className="label">Modelo</label>
          <select
            className="input"
            value={aiPrefs.ai_model}
            onChange={(e) => setAiPrefs((a) => ({ ...a, ai_model: e.target.value }))}
          >
            {activeProviderInfo.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Instruções de perfil</label>
          <p className="mb-1.5 text-xs text-white/35">
            Descreva seu perfil profissional para personalizar o tom e o estilo dos posts.
          </p>
          <textarea
            className="input min-h-[100px] resize-y"
            value={aiPrefs.profile_instructions}
            onChange={(e) =>
              setAiPrefs((a) => ({ ...a, profile_instructions: e.target.value }))
            }
            placeholder="Ex: Sou desenvolvedor full-stack com 5 anos de experiência em React e Node.js. Escrevo de forma técnica mas acessível, com foco em aprendizados práticos."
            maxLength={1000}
          />
          <p className="mt-1 text-right text-xs text-white/20">
            {aiPrefs.profile_instructions.length}/1000
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveAiPrefs} disabled={aiPrefsSaving} className="btn-primary">
            {aiPrefsSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </button>
          {aiPrefsSaved && <span className="text-sm text-green-400">Salvo!</span>}
        </div>
      </section>

      {/* Usage stats */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-brand-light" />
          <h2 className="text-sm font-semibold text-white/80">Consumo de API</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/5 p-3 text-center">
            <p className="text-2xl font-semibold text-white">{usageStats.today}</p>
            <p className="mt-0.5 text-xs text-white/35">Hoje</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3 text-center">
            <p className="text-2xl font-semibold text-white">{usageStats.week}</p>
            <p className="mt-0.5 text-xs text-white/35">Últimos 7 dias</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3 text-center">
            <p className="text-2xl font-semibold text-white">{usageStats.month}</p>
            <p className="mt-0.5 text-xs text-white/35">Este mês</p>
          </div>
        </div>
        <p className="text-xs text-white/25">Posts gerados via IA. Cada geração usa uma chamada à API do provedor.</p>
        {connectedProviders.length > 0 && (
          <p className="text-xs text-white/35">
            Provedor ativo:{" "}
            <span className="text-white/60">{PROVIDERS[aiPrefs.ai_provider as AIProvider]?.label}</span>
            {" · "}
            <span className="font-mono text-white/40">{aiPrefs.ai_model}</span>
          </p>
        )}
      </section>

      {/* Auto-post */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-light" />
          <h2 className="text-sm font-semibold text-white/80">Posts automáticos</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Gerar e publicar automaticamente</p>
            <p className="text-xs text-white/30">
              O CommitPost gera um post a partir dos seus commits e publica no LinkedIn. Você recebe
              um período de revisão antes da publicação.
            </p>
          </div>
          <button
            onClick={() =>
              setAutoPost((a) => ({ ...a, auto_post_enabled: !a.auto_post_enabled }))
            }
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              autoPost.auto_post_enabled ? "bg-brand" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                autoPost.auto_post_enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {autoPost.auto_post_enabled && (
          <>
            <div>
              <label className="label">Frequência</label>
              <select
                className="input"
                value={autoPost.auto_post_frequency}
                onChange={(e) =>
                  setAutoPost((a) => ({ ...a, auto_post_frequency: e.target.value }))
                }
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>

            <div>
              <label className="label">Horário preferido (UTC)</label>
              <select
                className="input"
                value={autoPost.auto_post_hour}
                onChange={(e) =>
                  setAutoPost((a) => ({ ...a, auto_post_hour: parseInt(e.target.value) }))
                }
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}:00 UTC
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-white/25">
                Horário em UTC. Para BRT (UTC-3) subtraia 3 horas.
              </p>
            </div>

            <div>
              <label className="label">Período de revisão antes de publicar</label>
              <select
                className="input"
                value={autoPost.auto_post_grace_hours}
                onChange={(e) =>
                  setAutoPost((a) => ({ ...a, auto_post_grace_hours: parseInt(e.target.value) }))
                }
              >
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={4}>4 horas</option>
                <option value={8}>8 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
              <p className="mt-1 text-xs text-white/25">
                O post fica visível no dashboard durante esse período. Você pode cancelar ou editar
                antes da publicação automática.
              </p>
            </div>

            {!linkedinConnected && (
              <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-300/80">
                Conecte o LinkedIn para que os posts sejam publicados automaticamente. Sem o
                LinkedIn, os posts serão gerados mas ficarão como rascunhos pendentes.
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-3">
          <button onClick={saveAutoPost} disabled={autoPostSaving} className="btn-primary">
            {autoPostSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </button>
          {autoPostSaved && <span className="text-sm text-green-400">Salvo!</span>}
        </div>
      </section>

      {/* General preferences */}
      <section className="card flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-white/80">Preferências de geração</h2>

        <div>
          <label className="label">Idioma dos posts</label>
          <select
            className="input"
            value={prefs.post_language}
            onChange={(e) => setPrefs((p) => ({ ...p, post_language: e.target.value }))}
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div>
          <label className="label">Commits dos últimos N dias</label>
          <input
            type="number"
            min={1}
            max={90}
            className="input"
            value={prefs.commits_since_days}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                commits_since_days: parseInt(e.target.value) || 30,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Gerar imagens</p>
            <p className="text-xs text-white/30">Cria uma imagem visual via Pollinations.ai</p>
          </div>
          <button
            onClick={() => setPrefs((p) => ({ ...p, enable_images: !p.enable_images }))}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              prefs.enable_images ? "bg-brand" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                prefs.enable_images ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {prefs.enable_images && (
          <div>
            <label className="label">Estilo visual</label>
            <select
              className="input"
              value={prefs.image_style}
              onChange={(e) => setPrefs((p) => ({ ...p, image_style: e.target.value }))}
            >
              <option value="professional">Profissional</option>
              <option value="tech">Tech / Dark</option>
              <option value="minimal">Minimalista</option>
              <option value="colorful">Colorido</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button onClick={savePreferences} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
          {saved && <span className="text-sm text-green-400">Salvo!</span>}
        </div>
      </section>

      {/* Danger zone */}
      <section className="card border-red-500/20">
        <h2 className="mb-1 text-sm font-semibold text-red-400">Zona de perigo</h2>
        <p className="mb-4 text-xs text-white/40">
          A exclusão de conta é permanente e irreversível. Todos os seus rascunhos,
          repositórios e integrações serão deletados imediatamente, conforme a LGPD.
        </p>

        {deleteError && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {deleteError}
          </p>
        )}

        <label className="label text-white/50">
          Digite <span className="font-mono text-red-400">EXCLUIR</span> para confirmar
        </label>
        <input
          className="input mb-3 max-w-xs"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="EXCLUIR"
          autoComplete="off"
        />

        <button
          onClick={deleteAccount}
          disabled={deleteConfirm !== "EXCLUIR" || deleting}
          className="btn-danger-outline"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir minha conta
        </button>
      </section>
    </div>
  );
}
