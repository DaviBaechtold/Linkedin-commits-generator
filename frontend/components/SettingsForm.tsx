"use client";

import { useState } from "react";
import type { UserPreferences } from "@/lib/supabase/types";
import { Linkedin, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";

interface Props {
  preferences: UserPreferences | null;
  linkedinConnected: boolean;
  linkedinExpiry: string | null;
  linkedinUsername: string | null;
}

export default function SettingsForm({
  preferences,
  linkedinConnected,
  linkedinExpiry,
  linkedinUsername,
}: Props) {
  const [prefs, setPrefs] = useState({
    post_language: preferences?.post_language ?? "pt-BR",
    enable_images: preferences?.enable_images ?? true,
    image_style: preferences?.image_style ?? "professional",
    commits_since_days: preferences?.commits_since_days ?? 30,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
            <button onClick={connectLinkedIn} className="btn-secondary text-xs py-1.5">
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
    </div>
  );
}
