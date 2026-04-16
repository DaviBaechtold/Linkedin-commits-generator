"""
Gerencia o estado persistente dos rascunhos em data/drafts.json.

Estrutura de um draft:
{
    "id": "20240115_143022",
    "created_at": "2024-01-15T14:30:22",
    "status": "pending" | "posted" | "discarded",
    "post_text": "...",
    "raw_log_summary": "...",
    "telegram_message_id": 12345,
    "linkedin_post_id": "urn:li:share:..." | null
}
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Literal

import config

DraftStatus = Literal["pending", "posted", "discarded"]


def _load() -> dict:
    if not config.DRAFTS_FILE.exists():
        return {"drafts": []}
    with open(config.DRAFTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(data: dict) -> None:
    with open(config.DRAFTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def create_draft(post_text: str, raw_log_summary: str) -> str:
    """Persiste um novo draft com status 'pending'. Retorna o ID gerado."""
    draft_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    draft = {
        "id": draft_id,
        "created_at": datetime.now().isoformat(),
        "status": "pending",
        "post_text": post_text,
        "raw_log_summary": raw_log_summary,
        "telegram_message_id": None,
        "linkedin_post_id": None,
    }
    data = _load()
    data["drafts"].append(draft)
    _save(data)
    return draft_id


def set_telegram_message_id(draft_id: str, message_id: int) -> None:
    data = _load()
    for draft in data["drafts"]:
        if draft["id"] == draft_id:
            draft["telegram_message_id"] = message_id
            _save(data)
            return
    raise KeyError(f"Draft não encontrado: {draft_id}")


def get_draft(draft_id: str) -> dict:
    data = _load()
    for draft in data["drafts"]:
        if draft["id"] == draft_id:
            return draft
    raise KeyError(f"Draft não encontrado: {draft_id}")


def get_pending_drafts() -> list[dict]:
    data = _load()
    return [d for d in data["drafts"] if d["status"] == "pending"]


def update_status(
    draft_id: str,
    status: DraftStatus,
    linkedin_post_id: str | None = None,
) -> None:
    data = _load()
    for draft in data["drafts"]:
        if draft["id"] == draft_id:
            draft["status"] = status
            if linkedin_post_id:
                draft["linkedin_post_id"] = linkedin_post_id
            _save(data)
            return
    raise KeyError(f"Draft não encontrado: {draft_id}")
