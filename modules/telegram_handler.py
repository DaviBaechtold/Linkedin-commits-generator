"""
Utilitários para envio de mensagens e teclados inline ao Telegram.

Esta camada é STATELESS — apenas formata e envia.
A lógica de callback fica em bot.py (o daemon de long polling).

Callback data convention:
    "regen_text_<draft_id>"   → usuário pediu para refazer texto
    "regen_image_<draft_id>"  → usuário pediu para refazer imagem
    "accept_<draft_id>"       → usuário aprovou/publicou
    "reject_<draft_id>"       → usuário reprovou/descartou
"""
from __future__ import annotations

from pathlib import Path
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


def _post_multipart(method: str, data: dict, files: dict) -> dict:
    resp = requests.post(f"{_BASE_URL}/{method}", data=data, files=files, timeout=30)
    resp.raise_for_status()
    body = resp.json()
    if not body.get("ok"):
        raise RuntimeError(f"Telegram API error [{method}]: {body.get('description')}")
    return body["result"]


def _send_visual_asset(draft_id: str, asset: dict, index: int, total: int) -> None:
    file_path = Path(asset.get("file_path", ""))
    if not file_path.exists() or not file_path.is_file():
        return

    mime_type = asset.get("mime_type", "image/png")
    method = "sendPhoto" if mime_type.startswith("image/") else "sendDocument"
    field_name = "photo" if method == "sendPhoto" else "document"

    caption = (
        f"🎨 Visual sugerido pelo Gemini ({index}/{total})\n"
        f"ID: {draft_id}\n"
        f"Estilo: {asset.get('kind', 'auto')}"
    )

    with open(file_path, "rb") as f:
        _post_multipart(
            method,
            data={
                "chat_id": str(config.TELEGRAM_CHAT_ID),
                "caption": caption,
            },
            files={field_name: (file_path.name, f, mime_type)},
        )


def send_visual_assets_for_review(draft_id: str, visual_assets: list[dict] | None = None) -> None:
    assets = visual_assets or []
    if not config.TELEGRAM_SEND_VISUAL_ASSETS or not assets:
        return

    for idx, asset in enumerate(assets, start=1):
        try:
            _send_visual_asset(draft_id, asset, idx, len(assets))
        except Exception:
            # Falha de mídia não deve bloquear o fluxo de aprovação.
            continue


def _build_review_message_text(draft_id: str, post_text: str) -> str:
    preview = post_text[:3500] + ("\n\n[...truncado para preview]" if len(post_text) > 3500 else "")
    return (
        f"📝 Draft para revisão\n"
        f"ID: {draft_id}\n\n"
        f"{'=' * 30}\n\n"
        f"{preview}\n\n"
        f"{'=' * 30}\n\n"
        f"Ações disponíveis:"
    )


def _build_review_keyboard(draft_id: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "♻️ Refazer texto", "callback_data": f"regen_text_{draft_id}"},
                {"text": "🖼️ Refazer imagem", "callback_data": f"regen_image_{draft_id}"},
            ],
            [
                {"text": "✅ Aceitar", "callback_data": f"accept_{draft_id}"},
                {"text": "❌ Reprovar", "callback_data": f"reject_{draft_id}"},
            ],
        ]
    }


def send_draft_for_review(
    draft_id: str,
    post_text: str,
    visual_assets: list[dict] | None = None,
) -> int:
    """
    Envia o post gerado para o chat do usuário com botões de aprovação.

    Returns:
        message_id da mensagem enviada (para edição posterior).
    """
    text = _build_review_message_text(draft_id, post_text)
    keyboard = _build_review_keyboard(draft_id)

    result = _post("sendMessage", {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "text": text,
        "reply_markup": keyboard,
    })

    send_visual_assets_for_review(draft_id, visual_assets)

    return result["message_id"]


def refresh_draft_review_message(message_id: int, draft_id: str, post_text: str) -> None:
    """Atualiza o texto de revisão mantendo os mesmos botões de ação."""
    _post("editMessageText", {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "message_id": message_id,
        "text": _build_review_message_text(draft_id, post_text),
        "reply_markup": _build_review_keyboard(draft_id),
    })


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
        "parse_mode": "Markdown",
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
