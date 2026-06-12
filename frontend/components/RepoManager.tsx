"use client";

import { useState } from "react";
import type { Repo } from "@/lib/supabase/types";
import {
  Github,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface GithubRepo {
  full_name: string;
  name: string;
  private: boolean;
}

interface Props {
  initialRepos: Repo[];
  githubUsername: string | null;
}

export default function RepoManager({ initialRepos, githubUsername }: Props) {
  const [repos, setRepos] = useState(initialRepos);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [showGithubPicker, setShowGithubPicker] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Manual form state
  const [manualName, setManualName] = useState("");
  const [manualAlias, setManualAlias] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadGithubRepos() {
    setLoadingGithub(true);
    try {
      const res = await fetch("/api/repos/github");
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.repos ?? []);
        setShowGithubPicker(true);
      }
    } finally {
      setLoadingGithub(false);
    }
  }

  async function importAllRepos() {
    setImportingAll(true);
    setImportedCount(null);
    try {
      const res = await fetch("/api/repos/github");
      if (!res.ok) return;
      const data = await res.json();
      const all: GithubRepo[] = data.repos ?? [];

      const toAdd = all.filter(
        (gr) => !repos.some((r) => r.github_full_name === gr.full_name)
      );

      if (toAdd.length === 0) {
        setImportedCount(0);
        return;
      }

      const added: Repo[] = [];
      for (let i = 0; i < toAdd.length; i++) {
        const gr = toAdd[i];
        const alias = `Projeto ${repos.length + added.length + 1}`;
        const r = await fetch("/api/repos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            github_full_name: gr.full_name,
            display_name: gr.name,
            alias,
          }),
        });
        if (r.ok) {
          const { repo } = await r.json();
          added.push(repo);
        }
      }

      setRepos((prev) => [...prev, ...added]);
      setImportedCount(added.length);
    } finally {
      setImportingAll(false);
    }
  }

  async function addGithubRepo(ghRepo: GithubRepo) {
    const alias = `Projeto ${repos.length + 1}`;
    const res = await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        github_full_name: ghRepo.full_name,
        display_name: ghRepo.name,
        alias,
      }),
    });
    if (res.ok) {
      const { repo } = await res.json();
      setRepos((prev) => [...prev, repo]);
      setShowGithubPicker(false);
    }
  }

  async function addManualRepo() {
    if (!manualName.trim() || !manualAlias.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: manualName.trim(),
          alias: manualAlias.trim(),
        }),
      });
      if (res.ok) {
        const { repo } = await res.json();
        setRepos((prev) => [...prev, repo]);
        setManualName("");
        setManualAlias("");
        setShowManualForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleRepo(id: string, enabled: boolean) {
    const res = await fetch(`/api/repos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setRepos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r))
      );
    }
  }

  async function deleteRepo(id: string) {
    const res = await fetch(`/api/repos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRepos((prev) => prev.filter((r) => r.id !== id));
    }
  }

  async function updateAlias(id: string, alias: string) {
    await fetch(`/api/repos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias }),
    });
  }

  return (
    <div className="flex flex-col gap-4" data-tutorial="repos">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {githubUsername && (
          <button
            onClick={loadGithubRepos}
            disabled={loadingGithub}
            className="btn-secondary"
          >
            {loadingGithub ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            Importar do GitHub
          </button>
        )}
        <button
          onClick={() => setShowManualForm((v) => !v)}
          className="btn-secondary"
        >
          <Plus className="h-4 w-4" />
          Adicionar manualmente
        </button>
      </div>

      {/* GitHub picker */}
      {showGithubPicker && githubRepos.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-white/70">
              Selecione um repositório
            </p>
            <button
              onClick={importAllRepos}
              disabled={importingAll}
              className="btn-primary py-1 text-xs"
            >
              {importingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {importingAll ? "Importando..." : "Importar todos"}
            </button>
          </div>
          {importedCount !== null && (
            <p className="mb-2 text-xs text-white/50">
              {importedCount === 0
                ? "Todos os repositórios já estão importados."
                : `${importedCount} repositório${importedCount > 1 ? "s" : ""} importado${importedCount > 1 ? "s" : ""} com sucesso.`}
            </p>
          )}
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {githubRepos
              .filter(
                (gr) => !repos.some((r) => r.github_full_name === gr.full_name)
              )
              .map((gr) => (
                <button
                  key={gr.full_name}
                  onClick={() => addGithubRepo(gr)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90"
                >
                  <span>{gr.full_name}</span>
                  {gr.private && (
                    <span className="text-xs text-white/30">privado</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Manual form */}
      {showManualForm && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-medium text-white/70">
            Repositório sem GitHub
          </p>
          <div>
            <label className="label">Nome do projeto</label>
            <input
              className="input"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="meu-projeto"
            />
          </div>
          <div>
            <label className="label">
              Alias público{" "}
              <span className="text-white/30">(aparece nos posts)</span>
            </label>
            <input
              className="input"
              value={manualAlias}
              onChange={(e) => setManualAlias(e.target.value)}
              placeholder="Projeto Principal"
            />
          </div>
          <button
            onClick={addManualRepo}
            disabled={saving || !manualName || !manualAlias}
            className="btn-primary self-start"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </button>
        </div>
      )}

      {/* Repo list */}
      {repos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
          <p className="text-sm text-white/30">Nenhum repositório ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className={`card flex items-center gap-3 ${
                !repo.enabled ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white/80">
                  {repo.display_name}
                </p>
                {repo.github_full_name && (
                  <p className="truncate text-xs text-white/30">
                    {repo.github_full_name}
                  </p>
                )}
              </div>

              <AliasInput
                defaultValue={repo.alias}
                onBlur={(val) => updateAlias(repo.id, val)}
              />

              <button
                onClick={() => toggleRepo(repo.id, !repo.enabled)}
                className="text-white/30 hover:text-white/70"
                title={repo.enabled ? "Desativar" : "Ativar"}
              >
                {repo.enabled ? (
                  <ToggleRight className="h-5 w-5 text-brand-light" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => deleteRepo(repo.id)}
                className="text-white/20 hover:text-red-400"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AliasInput({
  defaultValue,
  onBlur,
}: {
  defaultValue: string;
  onBlur: (val: string) => void;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <input
      className="w-28 rounded border border-white/5 bg-transparent px-2 py-1 text-xs text-white/50 focus:border-brand focus:outline-none focus:text-white/80"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onBlur(val)}
      title="Alias público (aparece nos posts)"
      placeholder="alias"
    />
  );
}
