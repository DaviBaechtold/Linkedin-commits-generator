"""
Utilitários para envio de mensagens e teclados inline ao Telegram.

Esta camada é STATELESS — apenas formata e envia.
A lógica de callback fica em bot.py (o daemon de long polling).

Callback data convention:
  "approve_<draft_id>"  → usuário aprovou
  "discard_<draft_id>"  → usuário descartou
"""
from __future__ import annotations

import requests

import config

_BASE_URL = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}"


def _post(method: str, payload: dict) -> dict:
    resp = requests.post(f"{_BASE_URL}/{method}", json=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error [{method}]: {data.get('description')}")
    return data["result"]


def send_draft_for_review(draft_id: str, post_text: str) -> int:
    """
    Envia o post gerado para o chat do usuário com botões de aprovação.

    Returns:
        message_id da mensagem enviada (para edição posterior).
    """
    preview = post_text[:3500] + ("\n\n[...truncado para preview]" if len(post_text) > 3500 else "")

    text = (
        f"📝 Novo draft pronto para revisão\n"
        f"ID: {draft_id}\n\n"
        f"{'=' * 30}\n\n"
        f"{preview}\n\n"
        f"{'=' * 30}\n\n"
        f"Revise o texto acima e escolha uma ação:"
    )

    keyboard = {
        "inline_keyboard": [[
            {"text": "🚀 Aprovar e Postar",  "callback_data": f"approve_{draft_id}"},
            {"text": "❌ Descartar",          "callback_data": f"discard_{draft_id}"},
        ]]
    }

    result = _post("sendMessage", {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "text": text,
        "reply_markup": keyboard,
    })
    return result["message_id"]


def edit_message_after_action(message_id: int, action: str, draft_id: str) -> None:
    """Edita a mensagem original removendo os botões e confirmando a ação."""
    action_text = {
        "posted":    "✅ *Post publicado no LinkedIn com sucesso!*",
        "discarded": "🗑 *Draft descartado.*",
        "error":     "⚠️ *Erro ao publicar. Verifique os logs.*",
    }.get(action, f"Ação: {action}")

    _post("editMessageText", {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "message_id": message_id,
        "text": f"{action_text}\n\nID: {draft_id}",
    })


def send_error_alert(message: str) -> None:
    """Envia alerta de erro simples (sem botões)."""
    _post("sendMessage", {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "text": f"⚠️ Erro na automação LinkedIn\n\n{message[:1000]}",
    })


def answer_callback_query(callback_query_id: str, text: str) -> None:
    """Confirma o callback para o Telegram (remove o loading no botão)."""
    _post("answerCallbackQuery", {
        "callback_query_id": callback_query_id,
        "text": text,
        "show_alert": False,
    })
