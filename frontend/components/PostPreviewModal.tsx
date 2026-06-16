"use client";

import { X, ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";
import type { VisualAsset } from "@/lib/supabase/types";

interface Props {
  postText: string;
  visualAssets: VisualAsset[];
  userName: string;
  userAvatar: string | null;
  onClose: () => void;
}

export default function PostPreviewModal({
  postText,
  visualAssets,
  userName,
  userAvatar,
  onClose,
}: Props) {
  const image = visualAssets[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[520px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white/70 hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>

        {/* LinkedIn-style card */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1D2226] shadow-2xl">
          {/* Top bar */}
          <div className="flex items-center gap-2 bg-[#0A66C2] px-4 py-2">
            <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4 shrink-0">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <span className="text-xs font-semibold text-white">Pré-visualização do post</span>
          </div>

          <div className="p-4">
            {/* Author row */}
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-[#0A66C2]">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                      {userName[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0A66C2] ring-2 ring-[#1D2226]">
                  <svg viewBox="0 0 24 24" fill="white" className="h-2.5 w-2.5">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-white/40">Software Developer</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-[11px] text-white/30">Agora</span>
                  <span className="text-[11px] text-white/20">·</span>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-white/30">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z" />
                    <path d="M8 3.5v4.75l3.25 1.875-.625 1.083L7 9V3.5H8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Post text */}
            <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-white/85">
              {postText}
            </p>

            {/* Image */}
            {image && (
              <div className="mt-3 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="max-h-64 w-full object-cover"
                />
              </div>
            )}

            {/* Reaction counts */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-white/30">
              <span>👍 😮 ❤️ <span className="underline decoration-dotted cursor-default">47</span></span>
              <span>3 comentários</span>
            </div>

            {/* Action bar */}
            <div className="mt-2 flex border-t border-white/[0.08] pt-2">
              {[
                { icon: ThumbsUp, label: "Curtir" },
                { icon: MessageSquare, label: "Comentar" },
                { icon: Repeat2, label: "Repostar" },
                { icon: Send, label: "Enviar" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-white/35 hover:bg-white/5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-white/20">
          Visualização aproximada — o LinkedIn pode renderizar de forma diferente
        </p>
      </div>
    </div>
  );
}
