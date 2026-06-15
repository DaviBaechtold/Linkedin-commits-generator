"use client";

import { useState, useTransition, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Draft } from "@/lib/supabase/types";
import DraftFilters, { type DraftFilter } from "./DraftFilters";
import {
  Check,
  X,
  RefreshCw,
  ImagePlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  CheckCheck,
  Trash2,
  Clock,
  Zap,
  Loader2,
  ImageOff,
  Sparkles,
  Heart,
  MessageCircle,
  Database,
  Cpu,
  GitBranch,
  Inbox,
  CalendarCheck,
} from "lucide-react";

interface Props {
  initialDrafts: Draft[];
}

const EMPTY_COPY: Record<DraftFilter, { title: string; sub: string }> = {
  all: {
    title: "Nenhum rascunho ainda",
    sub: 'Use o botão "Gerar post" acima para criar seu primeiro post a partir dos commits.',
  },
  pending: {
    title: "Nenhum rascunho pendente",
    sub: "Gere um novo post para revisar aqui.",
  },
  posted: {
    title: "Nenhum post publicado",
    sub: "Publique um rascunho e ele aparecerá aqui com métricas de engajamento.",
  },
  scheduled: {
    title: "Nenhum post agendado",
    sub: "Ative o auto-post nas Configurações para gerar e agendar posts automaticamente.",
  },
};

function EmptyIcon({ filter }: { filter: DraftFilter }) {
  if (filter === "all") return <GitBranch className="h-8 w-8 text-brand/60" />;
  if (filter === "posted") return <CalendarCheck className="h-8 w-8 text-white/20" />;
  if (filter === "scheduled") return <Clock className="h-8 w-8 text-white/20" />;
  return <Inbox className="h-8 w-8 text-white/20" />;
}

export default function DraftList({ initialDrafts }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [filter, setFilter] = useState<DraftFilter>("all");
  const [search, setSearch] = useState("");

  function updateDraft(updated: Draft) {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  const counts = useMemo(
    () => ({
      all: drafts.length,
      pending: drafts.filter((d) => d.status === "pending").length,
      posted: drafts.filter((d) => d.status === "posted").length,
      scheduled: drafts.filter((d) => d.status === "scheduled").length,
    }),
    [drafts]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drafts.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (q && !d.post_text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [drafts, filter, search]);

  return (
    <div>
      <DraftFilters
        filter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
        counts={counts}
      />

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
          {search.trim() ? (
            <p className="text-sm text-white/30">
              Nada encontrado para &ldquo;{search.trim()}&rdquo;.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <EmptyIcon filter={filter} />
              </div>
              <div>
                <p className="text-sm font-medium text-white/40">{EMPTY_COPY[filter].title}</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/20">
                  {EMPTY_COPY[filter].sub}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((draft, i) => (
            <div
              key={draft.id}
              style={{ animation: `draftIn .4s ${Math.min(i, 8) * 50}ms ease both` }}
            >
              <DraftCard draft={draft} onUpdate={updateDraft} onDelete={removeDraft} />
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes draftIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function useCountdown(scheduledFor: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!scheduledFor) return;

    function compute() {
      const ms = new Date(scheduledFor!).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("publicando em breve...");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      if (h > 0) setLabel(`em ${h}h ${m}min`);
      else setLabel(`em ${m}min`);
    }

    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [scheduledFor]);

  return label;
}

function DraftCard({
  draft,
  onUpdate,
  onDelete,
}: {
  draft: Draft;
  onUpdate: (d: Draft) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(
    draft.status === "pending" || draft.status === "scheduled"
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(draft.post_text);
  const [savingEdit, setSavingEdit] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>(draft.hashtags ?? []);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [syncingEng, setSyncingEng] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const countdown = useCountdown(draft.scheduled_for ?? null);

  // Auto-reset delete confirm after 3 seconds
  useEffect(() => {
    if (!deleteConfirm) return;
    const id = setTimeout(() => setDeleteConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [deleteConfirm]);

  async function apiAction(
    action: "publish" | "discard" | "cancel_schedule" | "regen_text"
  ) {
    setError(null);

    if (action === "publish") {
      const res = await fetch(`/api/drafts/${draft.id}/publish`, { method: "POST" });
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

    if (action === "cancel_schedule") {
      // Moves scheduled → pending (user keeps the draft for manual review)
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Falha ao cancelar agendamento.");
        return;
      }
      onUpdate({ ...draft, status: "pending", scheduled_for: null });
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

  }

  async function uploadImage(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    setImgBusy(true);
    if (!expanded) setExpanded(true);
    try {
      // Comprime/redimensiona no cliente — evita o limite de 4.5MB de body da
      // Vercel e deixa a imagem leve para o LinkedIn.
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([blob], "image.jpg", { type: "image/jpeg" }));
      const res = await fetch(`/api/drafts/${draft.id}/image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let msg = "Falha ao anexar imagem.";
        if (res.status === 413) msg = "Imagem muito grande mesmo após compressão. Tente outra.";
        else {
          try {
            const j = await res.json();
            msg = j.error ?? msg;
          } catch {
            /* resposta não-JSON */
          }
        }
        setError(msg);
        return;
      }
      onUpdate(await res.json());
    } catch {
      setError("Não foi possível processar a imagem. Tente outro arquivo.");
    } finally {
      setImgBusy(false);
    }
  }

  async function removeImage() {
    setImgBusy(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/image`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) onUpdate(json);
    } finally {
      setImgBusy(false);
    }
  }

  async function generateAiImage() {
    setError(null);
    setImgBusy(true);
    if (!expanded) setExpanded(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Falha ao gerar imagem com IA.");
        return;
      }
      onUpdate(json);
    } catch {
      setError("Erro de conexão ao gerar imagem.");
    } finally {
      setImgBusy(false);
    }
  }

  async function refreshEngagement() {
    setError(null);
    setSyncingEng(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/engagement`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Falha ao atualizar métricas.");
        return;
      }
      if (json.draft) onUpdate(json.draft);
      if (!json.synced) {
        setError("Métricas indisponíveis no momento (a API do LinkedIn não retornou dados).");
      }
    } catch {
      setError("Erro de conexão ao atualizar métricas.");
    } finally {
      setSyncingEng(false);
    }
  }

  function onPasteImage(e: React.ClipboardEvent) {
    if (!isActive) return;
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/")
    );
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        uploadImage(file);
      }
    }
  }

  async function deleteDraft() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
      onDelete(draft.id);
    } finally {
      setDeleting(false);
    }
  }

  async function updateHashtags(tags: string[]) {
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtags: tags }),
    });
    if (res.ok) {
      const json = await res.json();
      setHashtags(json.hashtags ?? []);
      onUpdate(json);
    }
  }

  async function removeHashtag(tag: string) {
    const updated = hashtags.filter((t) => t !== tag);
    setHashtags(updated);
    await updateHashtags(updated);
  }

  async function addHashtag() {
    const tag = newTag.trim().replace(/\s+/g, "");
    if (!tag) return;
    const formatted = tag.startsWith("#") ? tag : `#${tag}`;
    if (hashtags.includes(formatted) || hashtags.length >= 10) return;
    const updated = [...hashtags, formatted];
    setHashtags(updated);
    setNewTag("");
    setAddingTag(false);
    await updateHashtags(updated);
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

  const statusBadge: Record<string, React.ReactNode> = {
    pending: <span className="badge-pending">Aguardando</span>,
    posted: <span className="badge-posted">Publicado</span>,
    discarded: <span className="badge-discarded">Descartado</span>,
    regenerating: <span className="badge-regenerating">Gerando...</span>,
    scheduled: (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-300">
        <Clock className="h-3 w-3" />
        Agendado
      </span>
    ),
  };

  const isActive = draft.status === "pending";
  const hasImage = (draft.visual_assets?.length ?? 0) > 0;
  const isScheduled = draft.status === "scheduled";
  const isInactive = draft.status === "posted" || draft.status === "discarded";
  const isLoading = draft.status === "regenerating" || isPending || savingEdit;

  return (
    <div
      className="card outline-none"
      tabIndex={isActive ? 0 : undefined}
      onPaste={onPasteImage}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge[draft.status]}
          {draft.auto_generated && (
            <span className="inline-flex items-center gap-0.5 text-xs text-white/25">
              <Zap className="h-3 w-3" />
              Auto
            </span>
          )}
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
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Scheduled banner */}
      {isScheduled && countdown && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-blue-300">
              Publicação automática <span className="font-medium">{countdown}</span>
            </p>
          </div>
        </div>
      )}

      {/* Post text */}
      {editing ? (
        <div className="mt-3">
          <textarea
            className="input min-h-[180px] resize-y"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="mt-1 flex justify-end">
            <span
              className={`text-[11px] tabular-nums ${
                editText.length > 3000
                  ? "text-red-400"
                  : editText.length > 2700
                  ? "text-amber-400"
                  : "text-white/25"
              }`}
            >
              {editText.length} / 3000
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={saveEdit} disabled={savingEdit} className="btn-primary text-xs py-1.5">
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

      {/* Hashtag chips */}
      {expanded && !editing && (hashtags.length > 0 || isActive || isScheduled) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs text-brand-light"
            >
              {tag}
              {(isActive || isScheduled) && (
                <button
                  onClick={() => removeHashtag(tag)}
                  className="ml-0.5 text-brand-light/50 hover:text-brand-light"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {(isActive || isScheduled) && hashtags.length < 10 && (
            addingTag ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  className="h-6 w-28 rounded-full border border-brand/30 bg-brand/5 px-2.5 text-xs text-white/80 outline-none"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="#hashtag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addHashtag();
                    if (e.key === "Escape") { setAddingTag(false); setNewTag(""); }
                  }}
                  onBlur={() => { if (!newTag.trim()) setAddingTag(false); }}
                />
                <button onClick={addHashtag} className="text-brand-light/60 hover:text-brand-light">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-white/15 px-2 py-0.5 text-xs text-white/30 hover:border-white/30 hover:text-white/50"
              >
                + hashtag
              </button>
            )
          )}
        </div>
      )}

      {/* Insights de geração */}
      {expanded && !editing && ((draft.repos_used?.length ?? 0) > 0 || draft.model_used) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/30">
          {(draft.repos_used?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Database className="h-3 w-3" />
              {draft.repos_used!.join(", ")}
            </span>
          )}
          {draft.model_used && (
            <span className="inline-flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {draft.model_used}
            </span>
          )}
        </div>
      )}

      {/* Images */}
      {expanded && !editing && (imgBusy || (draft.visual_assets && draft.visual_assets.length > 0)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imgBusy ? (
            <div className="flex aspect-square w-48 flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] sm:w-64">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              <span className="text-[11px] text-white/30">Processando...</span>
            </div>
          ) : (
            draft.visual_assets!.map((asset, i) => (
              <div key={i} className="group relative">
                <DraftImage url={asset.url} />
                {isActive && (
                  <button
                    onClick={removeImage}
                    title="Remover imagem"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 opacity-0 transition-opacity hover:bg-black/80 hover:text-white group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      {/* Actions — pending */}
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
          <button onClick={copyText} disabled={isLoading} className="btn-secondary">
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
            onClick={() => fileRef.current?.click()}
            disabled={isLoading || imgBusy}
            className="btn-secondary"
            title="Anexar uma imagem do seu computador (ou cole com Ctrl+V)"
          >
            {imgBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {hasImage ? "Trocar imagem" : "Anexar imagem"}
          </button>
          <button
            onClick={generateAiImage}
            disabled={isLoading || imgBusy}
            className="btn-secondary"
            title="Gerar imagem com IA (requer chave DALL·E/Fal nas Configurações)"
          >
            {imgBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar com IA
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f);
              e.target.value = "";
            }}
          />
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

      {/* Actions — scheduled */}
      {expanded && isScheduled && !editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => startTransition(() => apiAction("publish"))}
            disabled={isLoading}
            className="btn-primary"
          >
            <Check className="h-4 w-4" />
            Publicar agora
          </button>
          <button onClick={copyText} disabled={isLoading} className="btn-secondary">
            {copied ? (
              <CheckCheck className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <button
            onClick={() => startTransition(() => apiAction("cancel_schedule"))}
            disabled={isLoading}
            className="btn-secondary"
          >
            <Clock className="h-4 w-4" />
            Cancelar agendamento
          </button>
          <button
            onClick={deleteDraft}
            disabled={deleting}
            className={deleteConfirm ? "btn-danger" : "btn-ghost text-red-400/60 hover:text-red-400"}
          >
            <Trash2 className="h-4 w-4" />
            {deleteConfirm ? "Confirmar exclusão" : "Excluir"}
          </button>
        </div>
      )}

      {/* Actions — inactive (posted / discarded) */}
      {expanded && isInactive && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={copyText} className="btn-secondary text-xs py-1.5">
            {copied ? (
              <CheckCheck className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
          <button
            onClick={deleteDraft}
            disabled={deleting}
            className={
              deleteConfirm
                ? "btn-danger text-xs py-1.5"
                : "btn-ghost text-xs py-1.5 text-red-400/50 hover:text-red-400"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteConfirm ? "Confirmar" : "Excluir"}
          </button>
        </div>
      )}

      {/* Engajamento (posts publicados) */}
      {draft.status === "posted" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-white/75">
            <Heart className="h-4 w-4 text-red-400/80" />
            <span className="tabular-nums">{draft.likes_count ?? "—"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-white/75">
            <MessageCircle className="h-4 w-4 text-blue-400/80" />
            <span className="tabular-nums">{draft.comments_count ?? "—"}</span>
          </span>
          <button
            onClick={refreshEngagement}
            disabled={syncingEng}
            className="btn-ghost text-xs py-1"
          >
            {syncingEng ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Atualizar métricas
          </button>
          {draft.engagement_synced_at && (
            <span className="text-xs text-white/25">
              {new Date(draft.engagement_synced_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
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

/** Redimensiona (máx 1600px) e re-encoda em JPEG no navegador. */
async function compressImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image load failed"));
    el.src = dataUrl;
  });

  const maxDim = 1600;
  let width = img.width;
  let height = img.height;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unsupported");
  ctx.fillStyle = "#ffffff"; // fundo p/ imagens com transparência
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))),
      "image/jpeg",
      0.85
    );
  });
}

function DraftImage({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="flex aspect-square w-48 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-center sm:w-64">
        <ImageOff className="h-5 w-5 text-white/25" />
        <span className="px-2 text-[11px] leading-tight text-white/30">
          Imagem indisponível
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir imagem em tamanho real"
      className="group relative block w-48 overflow-hidden rounded-lg sm:w-64"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setErrored(true)}
        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent py-2 text-[11px] text-white/0 transition-colors group-hover:text-white/80">
        <ExternalLink className="h-3 w-3" />
        ver em tamanho real
      </span>
    </a>
  );
}
