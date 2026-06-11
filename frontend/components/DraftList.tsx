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

  async function apiAction(
    action: "publish" | "discard" | "regen_text" | "regen_image"
  ) {
    if (action === "publish") {
      const res = await fetch(`/api/drafts/${draft.id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
      return;
    }

    if (action === "discard") {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "discarded" }),
      });
      if (res.ok) onUpdate({ ...draft, status: "discarded" });
      return;
    }

    if (action === "regen_text") {
      onUpdate({ ...draft, status: "regenerating" });
      const res = await fetch(`/api/drafts/${draft.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text" }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
      return;
    }

    if (action === "regen_image") {
      const res = await fetch(`/api/drafts/${draft.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image" }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    }
  }

  const statusBadge = {
    pending: <span className="badge-pending">Aguardando</span>,
    posted: <span className="badge-posted">Publicado</span>,
    discarded: <span className="badge-discarded">Descartado</span>,
    regenerating: <span className="badge-regenerating">Gerando...</span>,
  }[draft.status];

  const isActive = draft.status === "pending";
  const isLoading = draft.status === "regenerating" || isPending;

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

      {/* Post text preview */}
      <p
        className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/75 ${
          !expanded ? "line-clamp-3" : ""
        }`}
      >
        {draft.post_text}
      </p>

      {/* Images */}
      {expanded && draft.visual_assets && draft.visual_assets.length > 0 && (
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

      {/* Actions */}
      {expanded && isActive && (
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
