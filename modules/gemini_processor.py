"""
Processa o log de commits via Gemini API.
Atualizado para usar o novo SDK 'google-genai'.
"""
from __future__ import annotations
import base64
import io
import re
import time
from google import genai
from google.genai import types

import config

# ─── Configuração do Cliente ───────────────────────────────────────────────────
client = genai.Client(api_key=config.GEMINI_API_KEY)

_SAFETY_SETTINGS = [
    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
]

# ─── Super System Prompt ───────────────────────────────────────────────────────
_SYSTEM_PROMPT = """
Você é um Redator Técnico Sênior especializado em Personal Branding para
desenvolvedores de software. Sua missão dupla é:

MISSÃO 1 — FILTRO DE NDA (INEGOCIÁVEL)
Antes de escrever qualquer palavra, analise cada commit e aplique as regras abaixo:

REGRAS DE SANITIZAÇÃO (violação = falha crítica):
• NUNCA mencione nomes de empresas, clientes, produtos ou projetos internos.
• NUNCA inclua trechos de código, nomes de variáveis, funções, arquivos ou endpoints.
• NUNCA revele regras de negócio, fluxos proprietários, cenários específicos do cliente ou lógicas de domínio.
• NUNCA cite nomes de ferramentas internas, namespaces, URLs de staging/prod.
• Substitua SEMPRE nomes próprios e cenários de uso por abstrações técnicas genéricas.

GUIA DE ABSTRAÇÃO (exemplos):
  "Fix payment bug for ClientXYZ"         → "Diagnóstico de race condition em processamento assíncrono"
  "Refactor Oracle queries for BancoABC"  → "Otimização de queries legadas para redução de latência"
  "Facial recognition in tennis courts"   → "Análise de performance de visão computacional em ambientes abertos dinâmicos"

MISSÃO 2 — REDAÇÃO DO POST LINKEDIN
Após sanitizar os dados, escreva UM post coeso e engajador seguindo estas diretrizes:

ESTRUTURA OBRIGATÓRIA:
1. GANCHO (1-2 linhas): Uma pergunta provocativa, afirmação ousada ou cenário técnico com o qual outros devs se identifiquem.
2. O DESAFIO TÉCNICO (Storytelling): O que estava em jogo? Qual era a dificuldade (abstraída)? 
3. A ABORDAGEM E APRENDIZADO: Como o problema foi resolvido e qual lição de arquitetura ou engenharia ficou.
4. REFERÊNCIAS DE ESTUDO (Anti-Alucinação): Adicione uma breve seção recomendando 1 ou 2 fontes de estudo. IMPORTANTE: Não invente URLs profundas. Forneça apenas o domínio raiz oficial (ex: docs.aws.amazon.com) ou recomende os termos exatos de busca (ex: "Pesquise por 'Machine Learning Evaluation Metrics' no blog do Martin Fowler").
5. HASHTAGS: 4-5 hashtags em inglês.

REGRAS DE ESTILO (Otimizado para Leitura Mobile):
• Idioma: {language}
• Escaneabilidade: MÁXIMO de 3 a 4 linhas por parágrafo. Use quebras de linha para dar respiro à leitura.
• Tom: Profissional, mas conversacional — como um sênior trocando ideia no Slack.
• Emojis: Use no máximo 2, apenas para dar ênfase visual.
• Proibido: Jargões de marketing vazios ("soluções inovadoras", "quebrando paradigmas"). Foque no trade-off técnico.

OUTPUT: Apenas o texto do post, sem prefácio, sem explicações extras.
""".strip()


def _extract_retry_seconds(error_text: str) -> int | None:
    patterns = [
        r"retry in\s+([0-9]+(?:\.[0-9]+)?)s",
        r"retryDelay['\"]?:\s*['\"]([0-9]+)s['\"]",
    ]
    for pattern in patterns:
        match = re.search(pattern, error_text, flags=re.IGNORECASE)
        if not match:
            continue
        try:
            return max(1, int(float(match.group(1))))
        except (TypeError, ValueError):
            continue
    return None


def _compact_error_message(error_text: str, max_len: int = 280) -> str:
    one_line = " ".join(error_text.split())
    if len(one_line) <= max_len:
        return one_line
    return one_line[:max_len].rstrip() + "..."


def _call_with_retry(
    call,
    context: str,
    *,
    model_name: str,
    kind: str,
    retry_on_429: bool = False,
):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return call()
        except Exception as e:
            raw_error = str(e)

            if "503" in raw_error and attempt < (max_retries - 1):
                wait_time = 15 * (attempt + 1)
                print(
                    f"[Aviso] Servidor do Gemini ocupado em {context}. "
                    f"Tentando novamente em {wait_time}s... "
                    f"(Tentativa {attempt + 1}/{max_retries})"
                )
                time.sleep(wait_time)
                continue

            if retry_on_429 and "429" in raw_error:
                raw_lower = raw_error.lower()
                retry_seconds = _extract_retry_seconds(raw_error)

                if "resource_exhausted" in raw_lower and "free_tier" in raw_lower and "limit: 0" in raw_lower:
                    raise RuntimeError(
                        f"Cota gratuita indisponível para {kind} '{model_name}'."
                    )

                if (
                    attempt < (max_retries - 1)
                    and retry_seconds is not None
                    and retry_seconds <= config.GEMINI_RETRY_429_MAX_WAIT_SECONDS
                ):
                    print(
                        f"[Aviso] Limite temporário de cota em {context} ({model_name}). "
                        f"Aguardando {retry_seconds}s para retry... "
                        f"(Tentativa {attempt + 1}/{max_retries})"
                    )
                    time.sleep(retry_seconds)
                    continue

                if retry_seconds is not None:
                    raise RuntimeError(
                        f"Cota temporária excedida para {kind} '{model_name}'. "
                        f"Tente novamente em cerca de {retry_seconds}s."
                    )

                raise RuntimeError(
                    f"Cota excedida para {kind} '{model_name}'. "
                    "Tente novamente mais tarde ou ajuste o modelo visual."
                )

            raise RuntimeError(
                f"Falha na API do Gemini ({context}, modelo '{model_name}'): "
                f"{_compact_error_message(raw_error)}"
            )


def _decode_inline_data(data: bytes | str) -> bytes:
    if isinstance(data, (bytes, bytearray)):
        return bytes(data)
    try:
        return base64.b64decode(data)
    except Exception:
        return data.encode("utf-8", errors="ignore")


def _extract_inline_image(response) -> tuple[bytes, str] | None:
    candidates = getattr(response, "candidates", None) or []

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []

        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data is None and isinstance(part, dict):
                inline_data = part.get("inline_data") or part.get("inlineData")
            if not inline_data:
                continue

            mime_type = (
                getattr(inline_data, "mime_type", None)
                or getattr(inline_data, "mimeType", None)
                or (inline_data.get("mime_type") if isinstance(inline_data, dict) else None)
                or "image/png"
            )
            payload = getattr(inline_data, "data", None)
            if payload is None and isinstance(inline_data, dict):
                payload = inline_data.get("data")
            if payload is None:
                continue

            image_bytes = _decode_inline_data(payload)
            if image_bytes:
                return image_bytes, mime_type

    return None


def _extract_generated_image(response) -> tuple[bytes, str] | None:
    generated_images = getattr(response, "generated_images", None) or []

    for generated in generated_images:
        image_obj = getattr(generated, "image", None)
        if image_obj is None and isinstance(generated, dict):
            image_obj = generated.get("image")
        if image_obj is None:
            continue

        mime_type = (
            getattr(image_obj, "mime_type", None)
            or getattr(image_obj, "mimeType", None)
            or (image_obj.get("mime_type") if isinstance(image_obj, dict) else None)
            or "image/jpeg"
        )

        image_bytes = (
            getattr(image_obj, "image_bytes", None)
            or getattr(image_obj, "bytes", None)
            or (image_obj.get("image_bytes") if isinstance(image_obj, dict) else None)
            or (image_obj.get("bytes") if isinstance(image_obj, dict) else None)
            or (image_obj.get("data") if isinstance(image_obj, dict) else None)
        )
        if image_bytes:
            return _decode_inline_data(image_bytes), mime_type

        # Alguns SDKs retornam um objeto de imagem com .save (ex.: PIL-like).
        if hasattr(image_obj, "save"):
            buffer = io.BytesIO()
            fmt = "JPEG" if mime_type in ("image/jpeg", "image/jpg") else "PNG"
            image_obj.save(buffer, format=fmt)
            return buffer.getvalue(), mime_type

    return None


def _file_extension_for_mime(mime_type: str) -> str:
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
    }
    return mapping.get(mime_type, ".png")


def _build_visual_prompt(post_text: str, raw_log_summary: str, variant: int) -> str:
    language_map = {"pt-br": "Português do Brasil", "en": "English"}
    language = language_map.get(config.POST_LANGUAGE, "Português do Brasil")

    style_guidance = {
        "flowchart": (
            "Crie um fluxograma limpo e profissional, formato horizontal 16:9, "
            "com 4 etapas: Desafio, Abordagem, Aprendizado e Impacto."
        ),
        "illustration": (
            "Crie uma ilustração editorial técnica, estilo moderno e limpo, "
            "com foco em engenharia de software e aprendizado técnico."
        ),
        "auto": (
            "Escolha automaticamente entre fluxograma visual ou ilustração técnica, "
            "priorizando clareza para LinkedIn em mobile."
        ),
    }.get(config.VISUAL_ASSET_STYLE, "Crie um visual técnico limpo para LinkedIn.")

    return (
        "Você é um diretor de arte técnico para conteúdo de LinkedIn. "
        "Gere uma imagem única de alto impacto visual e leitura rápida.\n\n"
        "Regras obrigatórias:\n"
        "- Idioma dos textos visíveis na arte: " + language + "\n"
        "- Não inclua nomes de empresa, cliente, produto interno, endpoint ou código.\n"
        "- Não use logos de marcas nem elementos com copyright.\n"
        "- Evite texto excessivo; no máximo título + 4 blocos curtos.\n"
        "- Tema técnico coerente com o post abaixo.\n\n"
        "Direção visual:\n"
        f"- {style_guidance}\n"
        f"- Variante visual: {variant}.\n\n"
        "Contexto resumido de commits:\n"
        f"{raw_log_summary[:1200]}\n\n"
        "Post base:\n"
        f"{post_text[:2800]}\n"
    )


def _image_model_candidates() -> list[str]:
    candidates = [config.GEMINI_IMAGE_MODEL, *config.GEMINI_IMAGE_FALLBACK_MODELS]
    unique_candidates: list[str] = []
    for model in candidates:
        if model and model not in unique_candidates:
            unique_candidates.append(model)
    return unique_candidates


def _request_image_from_model(model_name: str, prompt: str) -> tuple[bytes, str]:
    generate_images_fn = getattr(client.models, "generate_images", None)
    generate_images_config_cls = getattr(types, "GenerateImagesConfig", None)

    if callable(generate_images_fn) and generate_images_config_cls is not None:
        try:
            image_response = _call_with_retry(
                lambda: generate_images_fn(
                    model=model_name,
                    prompt=prompt,
                    config=generate_images_config_cls(
                        number_of_images=1,
                        aspect_ratio="16:9",
                        output_mime_type="image/jpeg",
                    ),
                ),
                context="geração visual (images API)",
                model_name=model_name,
                kind="modelo visual",
                retry_on_429=True,
            )
            payload = _extract_generated_image(image_response)
            if payload:
                return payload
        except RuntimeError:
            # Fallback abaixo para generate_content.
            pass

    content_response = _call_with_retry(
        lambda: client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                safety_settings=_SAFETY_SETTINGS,
            ),
        ),
        context="geração visual",
        model_name=model_name,
        kind="modelo visual",
        retry_on_429=True,
    )

    payload = _extract_inline_image(content_response)
    if not payload:
        raise RuntimeError(
            "Modelo retornou sem imagem. "
            "Verifique se esse modelo suporta geração de imagem na Gemini API."
        )

    return payload

def generate_post(raw_log: str) -> str:
    language_map = {"pt-br": "Português do Brasil", "en": "English"}
    language = language_map.get(config.POST_LANGUAGE, "Português do Brasil")

    system = _SYSTEM_PROMPT.format(language=language)

    user_prompt = (
        "Abaixo está o histórico de commits das últimas semanas. "
        "Aplique o filtro de NDA e gere o post LinkedIn conforme as instruções.\n\n"
        f"--- INÍCIO DO LOG ---\n{raw_log}\n--- FIM DO LOG ---"
    )

    response = _call_with_retry(
        lambda: client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                safety_settings=_SAFETY_SETTINGS,
            )
        ),
        context="geração de texto",
        model_name=config.GEMINI_MODEL,
        kind="modelo de texto",
        retry_on_429=True,
    )

    if not response.text or not response.text.strip():
        raise RuntimeError("Gemini retornou resposta vazia.")

    return response.text.strip()


def generate_visual_assets(post_text: str, raw_log_summary: str, draft_id: str) -> list[dict]:
    """
    Gera imagens relacionadas ao post via modelo de imagem da Google.
    Mantém o fluxo opcional e não interrompe o projeto caso falhe.
    """
    if not config.ENABLE_VISUAL_ASSETS:
        return []

    attempts: list[str] = []

    for model_name in _image_model_candidates():
        assets: list[dict] = []

        try:
            for idx in range(1, config.VISUAL_ASSET_COUNT + 1):
                prompt = _build_visual_prompt(post_text, raw_log_summary, variant=idx)

                image_bytes, mime_type = _request_image_from_model(model_name, prompt)
                extension = _file_extension_for_mime(mime_type)
                file_name = f"{draft_id}_visual_{idx}{extension}"
                file_path = config.VISUALS_DIR / file_name

                with open(file_path, "wb") as f:
                    f.write(image_bytes)

                assets.append({
                    "file_path": str(file_path),
                    "mime_type": mime_type,
                    "kind": config.VISUAL_ASSET_STYLE,
                    "model": model_name,
                })

            return assets

        except RuntimeError as e:
            attempts.append(f"{model_name}: {e}")
            continue

    tested_models = ", ".join(_image_model_candidates())
    detail = attempts[-1] if attempts else "sem detalhes"
    raise RuntimeError(
        "Falha na geração visual após tentar modelos disponíveis. "
        f"Modelos testados: {tested_models}. Último erro: {detail}"
    )
