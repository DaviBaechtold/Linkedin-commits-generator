#!/usr/bin/env python3
"""
bot.py — Daemon de Long Polling do Telegram.

Deve rodar continuamente como um serviço (systemd ou screen/tmux).
Ouve callbacks dos botões inline e, ao receber aprovação, publica no LinkedIn.

Instalação como serviço systemd:
  Veja setup.sh para o arquivo de unit gerado automaticamente.

Uso manual (desenvolvimento):
  python3 bot.py

Fluxo de callback:
  Usuário clica em [🚀 Aprovar e Postar]
    → bot recebe callback_data = "approve_<draft_id>"
    → publica no LinkedIn
    → edita a mensagem Telegram com confirmação

  Usuário clica em [❌ Descartar]
    → bot recebe callback_data = "discard_<draft_id>"
    → marca draft como descartado
    → edita a mensagem Telegram com confirmação
"""
import asyncio
import logging
import sys

from telegram import Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ContextTypes,
)

import config
from modules import linkedin_publisher, state_manager, telegram_handler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# Silencia logs verbosos do httpx (usado pelo python-telegram-bot internamente)
logging.getLogger("httpx").setLevel(logging.WARNING)


async def _handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query or not query.data:
        return

    # Garante que só o dono do bot pode interagir
    if query.from_user.id != config.TELEGRAM_CHAT_ID:
        await query.answer("Acesso negado.", show_alert=True)
        return

    await query.answer()  # Remove o loading do botão imediatamente

    data: str = query.data
    log.info("Callback recebido: %s", data)

    if data.startswith("approve_"):
        draft_id = data[len("approve_"):]
        await _handle_approve(draft_id, query.message.message_id)

    elif data.startswith("discard_"):
        draft_id = data[len("discard_"):]
        await _handle_discard(draft_id, query.message.message_id)

    else:
        log.warning("Callback desconhecido: %s", data)


async def _handle_approve(draft_id: str, message_id: int) -> None:
    log.info("Aprovação recebida para draft %s. Publicando no LinkedIn...", draft_id)

    try:
        draft = state_manager.get_draft(draft_id)
    except KeyError:
        log.error("Draft não encontrado: %s", draft_id)
        telegram_handler.edit_message_after_action(message_id, "error", draft_id)
        return

    if draft["status"] != "pending":
        log.warning("Draft %s já foi processado (status=%s).", draft_id, draft["status"])
        telegram_handler.send_error_alert(
            f"Draft {draft_id} já foi processado anteriormente (status: {draft['status']})."
        )
        return

    try:
        post_urn = linkedin_publisher.publish(draft["post_text"])
        state_manager.update_status(draft_id, "posted", linkedin_post_id=post_urn)
        telegram_handler.edit_message_after_action(message_id, "posted", draft_id)
        log.info("Post publicado no LinkedIn. URN: %s", post_urn)

    except Exception as e:
        log.exception("Erro ao publicar no LinkedIn: %s", e)
        state_manager.update_status(draft_id, "pending")  # mantém como pending para retry
        telegram_handler.edit_message_after_action(message_id, "error", draft_id)
        telegram_handler.send_error_alert(
            f"Falha ao publicar draft {draft_id} no LinkedIn:\n{e}"
        )


async def _handle_discard(draft_id: str, message_id: int) -> None:
    log.info("Descarte recebido para draft %s.", draft_id)
    try:
        state_manager.update_status(draft_id, "discarded")
        telegram_handler.edit_message_after_action(message_id, "discarded", draft_id)
    except KeyError:
        log.error("Draft não encontrado para descartar: %s", draft_id)


def main() -> None:
    log.info("Iniciando bot de aprovação LinkedIn (long polling)...")

    application = (
        Application.builder()
        .token(config.TELEGRAM_BOT_TOKEN)
        .build()
    )

    application.add_handler(CallbackQueryHandler(_handle_callback))

    log.info("Bot rodando. Aguardando aprovações no Telegram...")
    application.run_polling(
        poll_interval=2.0,          # verifica a cada 2 segundos
        timeout=30,                 # timeout do long poll no servidor Telegram
        drop_pending_updates=False, # processa callbacks pendentes ao reiniciar
        allowed_updates=["callback_query"],
    )


if __name__ == "__main__":
    main()
