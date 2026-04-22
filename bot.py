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
    Usuário clica em [♻️ Refazer texto]
        → bot recebe callback_data = "regen_text_<draft_id>"
        → regenera o texto e atualiza a mensagem de revisão

    Usuário clica em [🖼️ Refazer imagem]
        → bot recebe callback_data = "regen_image_<draft_id>"
        → regenera a imagem e envia novamente no Telegram

    Usuário clica em [✅ Aceitar]
        → bot recebe callback_data = "accept_<draft_id>"
    → publica no LinkedIn
    → edita a mensagem Telegram com confirmação

    Usuário clica em [❌ Reprovar]
        → bot recebe callback_data = "reject_<draft_id>"
    → marca draft como descartado
    → edita a mensagem Telegram com confirmação
"""
import asyncio
import logging

from telegram import Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ContextTypes,
)

import config
from modules import gemini_processor, linkedin_publisher, state_manager, telegram_handler

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
    message_id = query.message.message_id if query.message else None
    log.info("Callback recebido: %s", data)

    if message_id is None:
        log.warning("Callback sem message_id: %s", data)
        return

    if data.startswith("regen_text_"):
        draft_id = data[len("regen_text_"):]
        await _handle_regen_text(draft_id, message_id)

    elif data.startswith("regen_image_"):
        draft_id = data[len("regen_image_"):]
        await _handle_regen_image(draft_id)

    elif data.startswith("accept_"):
        draft_id = data[len("accept_"):]
        await _handle_approve(draft_id, message_id)

    elif data.startswith("reject_"):
        draft_id = data[len("reject_"):]
        await _handle_discard(draft_id, message_id)

    # Compatibilidade com mensagens antigas já enviadas
    elif data.startswith("approve_"):
        draft_id = data[len("approve_"):]
        await _handle_approve(draft_id, message_id)

    elif data.startswith("discard_"):
        draft_id = data[len("discard_"):]
        await _handle_discard(draft_id, message_id)

    else:
        log.warning("Callback desconhecido: %s", data)


def _get_pending_draft(draft_id: str) -> dict | None:
    try:
        draft = state_manager.get_draft(draft_id)
    except KeyError:
        log.error("Draft não encontrado: %s", draft_id)
        return None

    if draft["status"] != "pending":
        log.warning("Draft %s já foi processado (status=%s).", draft_id, draft["status"])
        telegram_handler.send_error_alert(
            f"Draft {draft_id} já foi processado anteriormente (status: {draft['status']})."
        )
        return None

    return draft


async def _handle_regen_text(draft_id: str, message_id: int) -> None:
    log.info("Refazendo texto para draft %s...", draft_id)
    draft = _get_pending_draft(draft_id)
    if not draft:
        telegram_handler.edit_message_after_action(message_id, "error", draft_id)
        return

    try:
        new_text = await asyncio.to_thread(
            gemini_processor.generate_post,
            draft["raw_log_summary"],
        )
        await asyncio.to_thread(state_manager.update_post_text, draft_id, new_text)
        await asyncio.to_thread(
            telegram_handler.refresh_draft_review_message,
            message_id,
            draft_id,
            new_text,
        )
        log.info("Texto do draft %s foi regenerado com sucesso.", draft_id)
    except Exception as e:
        log.exception("Erro ao refazer texto do draft %s: %s", draft_id, e)
        telegram_handler.send_error_alert(
            f"Falha ao refazer texto do draft {draft_id}:\n{e}"
        )


async def _handle_regen_image(draft_id: str) -> None:
    log.info("Refazendo imagem para draft %s...", draft_id)
    if not config.ENABLE_VISUAL_ASSETS:
        telegram_handler.send_error_alert(
            "Geração visual está desativada no .env (ENABLE_VISUAL_ASSETS=false)."
        )
        return

    draft = _get_pending_draft(draft_id)
    if not draft:
        return

    try:
        visual_assets = await asyncio.to_thread(
            gemini_processor.generate_visual_assets,
            draft["post_text"],
            draft["raw_log_summary"],
            draft_id,
        )
        await asyncio.to_thread(state_manager.set_visual_assets, draft_id, visual_assets)
        await asyncio.to_thread(
            telegram_handler.send_visual_assets_for_review,
            draft_id,
            visual_assets,
        )
        log.info("Imagem(ns) do draft %s regenerada(s): %d", draft_id, len(visual_assets))
    except Exception as e:
        log.exception("Erro ao refazer imagem do draft %s: %s", draft_id, e)
        error_msg = str(e)
        guidance = (
            "\n\nDica: defina GEMINI_IMAGE_MODEL com um modelo que tenha cota grátis "
            "e configure GEMINI_IMAGE_FALLBACK_MODELS no .env."
            if "Cota" in error_msg or "quota" in error_msg.lower()
            else ""
        )
        telegram_handler.send_error_alert(
            f"Falha ao refazer imagem do draft {draft_id}:\n{error_msg[:700]}{guidance}"
        )


async def _handle_approve(draft_id: str, message_id: int) -> None:
    log.info("Aprovação recebida para draft %s. Publicando no LinkedIn...", draft_id)

    draft = _get_pending_draft(draft_id)
    if not draft:
        telegram_handler.edit_message_after_action(message_id, "error", draft_id)
        return

    try:
        visual_path = None
        visual_assets = draft.get("visual_assets") or []
        if config.LINKEDIN_PUBLISH_WITH_VISUAL and visual_assets:
            visual_path = visual_assets[0].get("file_path")

        if visual_path:
            try:
                post_urn = linkedin_publisher.publish(
                    draft["post_text"],
                    image_path=visual_path,
                )
            except Exception as visual_error:
                if not config.LINKEDIN_FALLBACK_TEXT_IF_VISUAL_FAILS:
                    raise
                log.warning(
                    "Falha ao publicar com imagem (%s). Aplicando fallback para texto.",
                    visual_error,
                )
                post_urn = linkedin_publisher.publish(draft["post_text"])
        else:
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
