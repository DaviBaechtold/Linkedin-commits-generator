#!/usr/bin/env python3
"""
generate.py — Script de geração de posts. Disparado pelo cron.

Fluxo:
  1. Extrai commits dos repositórios locais configurados
  2. Chama a Gemini API para gerar o post (com filtro de NDA)
  3. (Opcional) Gera imagem/fluxograma via modelo visual do Gemini
  4. Persiste o draft em data/drafts.json
  5. Envia o draft para o Telegram com botões de aprovação

Configuração do cron (a cada 2 semanas, às 09h de segunda-feira):
  0 9 * * 1 [ $(( $(date +\%W) \% 2 )) -eq 0 ] && /usr/bin/python3 /caminho/para/generate.py >> /caminho/para/logs/generate.log 2>&1

Ou mais simplesmente com cron quinzenal:
  0 9 1,15 * * /usr/bin/python3 /caminho/para/generate.py >> /caminho/para/logs/generate.log 2>&1
"""
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def main() -> int:
    # Importações tardias para que erros de config apareçam com contexto
    try:
        import config  # noqa: F401 — valida variáveis obrigatórias
        from modules import git_extractor, gemini_processor, state_manager, telegram_handler
    except (EnvironmentError, FileNotFoundError) as e:
        log.error("Erro de configuração: %s", e)
        return 1

    # ── 1. Extração dos commits ────────────────────────────────────────────────
    log.info("Extraindo commits dos repositórios configurados...")
    extraction = git_extractor.extract()

    if not extraction.commits:
        log.warning(
            "Nenhum commit encontrado no período '%s' para o autor '%s'. "
            "Encerrando sem gerar post.",
            config.GIT_SINCE, config.GIT_AUTHOR_NAME,
        )
        return 0

    log.info(
        "Encontrados %d commits em %d/%d repositórios.",
        len(extraction.commits),
        extraction.repos_with_activity,
        extraction.total_repos_scanned,
    )

    raw_log = git_extractor.format_for_prompt(extraction)

    # ── 2. Geração via Gemini ──────────────────────────────────────────────────
    log.info("Enviando commits para a Gemini API (modelo: %s)...", config.GEMINI_MODEL)
    try:
        post_text = gemini_processor.generate_post(raw_log)
    except RuntimeError as e:
        log.error("Falha na geração do post: %s", e)
        try:
            from modules import telegram_handler as tg
            tg.send_error_alert(str(e))
        except Exception:
            pass
        return 1

    log.info("Post gerado com sucesso (%d caracteres).", len(post_text))

    # ── 3. Persistência do draft ───────────────────────────────────────────────
    # Guarda apenas o sumário do log (primeiras linhas) — não o texto completo
    log_summary = "\n".join(raw_log.splitlines()[:10])
    draft_id = state_manager.create_draft(
        post_text=post_text,
        raw_log_summary=log_summary,
    )
    log.info("Draft persistido com ID: %s", draft_id)

    # ── 4. Geração opcional de imagem (Pollinations.ai — gratuito) ───────────────
    visual_assets: list[dict] = []
    if config.ENABLE_VISUAL_ASSETS:
        log.info("Gerando imagem via Pollinations.ai (gratuito, sem API key)...")
        try:
            from modules import image_generator
            img_path = image_generator.generate(
                post_text=post_text,
                draft_id=draft_id,
                style=config.VISUAL_ASSET_STYLE,
            )
            visual_assets = [{"file_path": str(img_path), "mime_type": "image/jpeg"}]
            state_manager.set_visual_assets(draft_id, visual_assets)
            log.info("Imagem gerada: %s", img_path)
        except RuntimeError as e:
            log.warning("Falha na geração de imagem; seguindo apenas com texto: %s", e)

    # ── 5. Envio ao Telegram ───────────────────────────────────────────────────
    log.info("Enviando draft ao Telegram para revisão...")
    try:
        message_id = telegram_handler.send_draft_for_review(
            draft_id,
            post_text,
            visual_assets=visual_assets,
        )
        state_manager.set_telegram_message_id(draft_id, message_id)
        log.info("Mensagem Telegram enviada (message_id=%d). Aguardando aprovação.", message_id)
    except Exception as e:
        log.error("Falha ao enviar para o Telegram: %s", e)
        # Draft ainda está salvo — pode ser reenviado manualmente
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
