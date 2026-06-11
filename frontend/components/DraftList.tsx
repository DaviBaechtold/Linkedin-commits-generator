"use client";

import { useState, useTransition } from "react";
import type { Draft } from "@/lib/supabase/types";
import {
  Check,
  X,
  RefreshCw,
  Image,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  CheckCheck,
} from "lucide-react";

interface Props {
  initialDrafts: Draft[];
}

export default function DraftList({ initialDrafts }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);

  function updateDraft(updated: Draft) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
        <p className="text-sm text-white/30">Nenhum rascunho ainda.</p>
        <p className="mt-1 text-xs text-white/20">
          Clique em "Gerar post" para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {drafts.map((draft) => (
        <DraftCard key={draft.id} draft={draft} onUpdate={updateDraft} />
      ))}
    </div>
  );
}

function DraftCard({
  draft,
  onUpdate,
}: {
  draft: Draft;
  onUpdate: (d: Draft) => void;
}) {
  const [expanded, setExpanded] = useState(draft.status === "pending");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(draft.post_text);
  const [savingEdit, setSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  async function apiAction(
    action: "publish" | "discard" | "regen_text" | "regen_image"
  ) {
    setError(null);

    if (action === "publish") {
      const res = await fetch(`/api/drafts/${draft.id}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Falha ao publicar.");
        return;
      }
      onUpdate(json);
      return;
    }

    if (action === "discard") {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "discarded" }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Falha ao descartar.");
        return;
      }
      onUpdate({ ...draft, status: "discarded" });
      return;
    }

    if (action === "regen_text") {
      onUpdate({ ...draft, status: "regenerating" });
      const res = await fetch(`/api/drafts/${draft.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text" }),
      });
      const json = await res.json();
      if (!res.ok) {
        onUpdate({ ...draft, status: "pending" });
        setError(json.error ?? "Falha ao regenerar texto.");
        return;
      }
      setEditText(json.post_text);
      onUpdate(json);
      return;
    }

    if (action === "regen_image") {
      const res = await fetch(`/api/drafts/${draft.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Falha ao regenerar imagem.");
        return;
      }
      onUpdate(json);
    }
  }

  async function saveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === draft.post_text) {
      setEditing(false);
      return;
    }
    setSavingEdit(true);
    setError(null);
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_text: trimmed }),
    });
    const json = await res.json();
    setSavingEdit(false);
    if (!res.ok) {
      setError(json.error ?? "Falha ao salvar edição.");
      return;
    }
    onUpdate(json);
    setEditing(false);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(draft.post_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  const statusBadge = {
    pending: <span className="badge-pending">Aguardando</span>,
    posted: <span className="badge-posted">Publicado</span>,
    discarded: <span className="badge-discarded">Descartado</span>,
    regenerating: <span className="badge-regenerating">Gerando...</span>,
  }[draft.status];

  const isActive = draft.status === "pending";
  const isLoading = draft.status === "regenerating" || isPending || savingEdit;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          <span className="text-xs text-white/25">
            {new Date(draft.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-white/30 hover:text-white/60"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Post text — preview or edit */}
      {editing ? (
        <div className="mt-3">
          <textarea
            className="input min-h-[180px] resize-y"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="btn-primary text-xs py-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Salvar
            </button>
            <button
              onClick={() => {
                setEditText(draft.post_text);
                setEditing(false);
              }}
              className="btn-secondary text-xs py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/75 ${
            !expanded ? "line-clamp-3" : ""
          }`}
        >
          {draft.post_text}
        </p>
      )}

      {/* Images */}
      {expanded && !editing && draft.visual_assets && draft.visual_assets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.visual_assets.map((asset, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={asset.url}
              alt={`Visual ${i + 1}`}
              className="h-32 w-32 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* Actions */}
      {expanded && isActive && !editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => startTransition(() => apiAction("publish"))}
            disabled={isLoading}
            className="btn-primary"
          >
            <Check className="h-4 w-4" />
            Publicar
          </button>
          <button
            onClick={() => {
              setEditText(draft.post_text);
              setEditing(true);
            }}
            disabled={isLoading}
            className="btn-secondary"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={copyText}
            disabled={isLoading}
            className="btn-secondary"
          >
            {copied ? (
              <CheckCheck className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <button
            onClick={() => startTransition(() => apiAction("regen_text"))}
            disabled={isLoading}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerar texto
          </button>
          <button
            onClick={() => startTransition(() => apiAction("regen_image"))}
            disabled={isLoading}
            className="btn-secondary"
          >
            <Image className="h-4 w-4" />
            Nova imagem
          </button>
          <button
            onClick={() => startTransition(() => apiAction("discard"))}
            disabled={isLoading}
            className="btn-danger"
          >
            <X className="h-4 w-4" />
            Descartar
          </button>
        </div>
      )}

      {/* Copy button for non-active drafts */}
      {expanded && !isActive && draft.status !== "regenerating" && (
        <div className="mt-3">
          <button onClick={copyText} className="btn-secondary text-xs py-1.5">
            {copied ? (
              <CheckCheck className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
        </div>
      )}

      {/* LinkedIn link */}
      {draft.status === "posted" && draft.linkedin_post_id && (
        <div className="mt-3">
          <a
            href={`https://www.linkedin.com/feed/update/${draft.linkedin_post_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-light hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver no LinkedIn
          </a>
        </div>
      )}
    </div>
  );
}
