"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPreferences } from "@/lib/supabase/types";
import { Linkedin, CheckCircle, AlertCircle, Loader2, Save, Trash2, Key, ExternalLink } from "lucide-react";

interface Props {
  preferences: UserPreferences | null;
  linkedinConnected: boolean;
  linkedinExpiry: string | null;
  linkedinUsername: string | null;
  geminiConnected: boolean;
  geminiKeyHint: string | null;
}

export default function SettingsForm({
  preferences,
  linkedinConnected,
  linkedinExpiry,
  linkedinUsername,
  geminiConnected,
  geminiKeyHint,
}: Props) {
  const router = useRouter();
  const [prefs, setPrefs] = useState({
    post_language: preferences?.post_language ?? "pt-BR",
    enable_images: preferences?.enable_images ?? true,
    image_style: preferences?.image_style ?? "professional",
    commits_since_days: preferences?.commits_since_days ?? 30,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiSaved, setGeminiSaved] = useState(geminiConnected);
  const [geminiHint, setGeminiHint] = useState(geminiKeyHint);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const linkedinExpired =
    linkedinExpiry && new Date(linkedinExpiry) < new Date();

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

  function connectLinkedIn() {
    window.location.href = "/api/auth/linkedin";
  }

  async function saveGeminiKey() {
    setGeminiSaving(true);
    setGeminiError(null);
    try {
      const res = await fetch("/api/integrations/gemini", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: geminiKey }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGeminiError(json.error ?? "Falha ao salvar chave.");
        return;
      }
      setGeminiSaved(true);
      setGeminiHint(`...${geminiKey.trim().slice(-4)}`);
      setGeminiKey("");
    } finally {
      setGeminiSaving(false);
    }
  }

  async function removeGeminiKey() {
    setGeminiSaving(true);
    setGeminiError(null);
    try {
      await fetch("/api/integrations/gemini", { method: "DELETE" });
      setGeminiSaved(false);
      setGeminiHint(null);
    } finally {
      setGeminiSaving(false);
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

  return (
    <div className="flex flex-col gap-6">
      {/* LinkedIn */}
      <section className="card">
        <h2 className="mb-4 text-sm font-semibold text-white/80">
          Integração LinkedIn
        </h2>
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
                    Expira em{" "}
                    {new Date(linkedinExpiry).toLocaleDateString("pt-BR")}
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
              <button
                onClick={connectLinkedIn}
                className="btn-primary mt-3"
              >
                <Linkedin className="h-4 w-4" />
                Conectar LinkedIn
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Gemini API Key */}
      <section className="card flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-brand-light" />
          <h2 className="text-sm font-semibold text-white/80">Gemini API Key</h2>
        </div>

        {geminiSaved ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm text-white/80">Conectado</p>
                {geminiHint && (
                  <p className="text-xs text-white/30 font-mono">{geminiHint}</p>
                )}
              </div>
            </div>
            <button
              onClick={removeGeminiKey}
              disabled={geminiSaving}
              className="btn-ghost"
            >
              {geminiSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Remover
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-white/40">
              O CommitPost usa sua própria chave Gemini — você controla o uso e a quota.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-brand-light hover:underline"
              >
                Obter chave no AI Studio
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            {geminiError && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {geminiError}
              </p>
            )}
            <input
              type="password"
              className="input"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              autoComplete="off"
            />
            <button
              onClick={saveGeminiKey}
              disabled={geminiSaving || !geminiKey.trim()}
              className="btn-primary self-start"
            >
              {geminiSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Salvar chave
            </button>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="card flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-white/80">
          Preferências de geração
        </h2>

        <div>
          <label className="label">Idioma dos posts</label>
          <select
            className="input"
            value={prefs.post_language}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, post_language: e.target.value }))
            }
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
            <p className="text-xs text-white/30">
              Cria uma imagem visual via Pollinations.ai
            </p>
          </div>
          <button
            onClick={() =>
              setPrefs((p) => ({ ...p, enable_images: !p.enable_images }))
            }
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
              onChange={(e) =>
                setPrefs((p) => ({ ...p, image_style: e.target.value }))
              }
            >
              <option value="professional">Profissional</option>
              <option value="tech">Tech / Dark</option>
              <option value="minimal">Minimalista</option>
              <option value="colorful">Colorido</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </button>
          {saved && (
            <span className="text-sm text-green-400">Salvo!</span>
          )}
        </div>
      </section>
      {/* Zona de perigo */}
      <section className="card border-red-500/20">
        <h2 className="mb-1 text-sm font-semibold text-red-400">
          Zona de perigo
        </h2>
        <p className="mb-4 text-xs text-white/40">
          A exclusão de conta é permanente e irreversível. Todos os seus
          rascunhos, repositórios e integrações serão deletados imediatamente,
          conforme a LGPD.
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
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Excluir minha conta
        </button>
      </section>
    </div>
  );
}
