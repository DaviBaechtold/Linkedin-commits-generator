"""
Processa o log de commits via Gemini API.
Atualizado para usar o novo SDK 'google-genai' com integração multi-modelos (Texto -> Imagem).
"""
from __future__ import annotations
import base64
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

MISSÃO 2 — REDAÇÃO DO POST LINKEDIN
Após sanitizar os dados, escreva UM post coeso e engajador seguindo estas diretrizes:

ESTRUTURA OBRIGATÓRIA:
1. GANCHO (1-2 linhas): Uma pergunta provocativa ou cenário técnico com o qual outros devs se identifiquem.
2. O DESAFIO TÉCNICO (Storytelling): O que estava em jogo? Qual era a dificuldade (abstraída)? 
3. A ABORDAGEM E APRENDIZADO: Como o problema foi resolvido e qual lição de arquitetura ou engenharia ficou.
4. REFERÊNCIAS DE ESTUDO (Anti-Alucinação): Adicione uma breve seção recomendando 1 ou 2 fontes de estudo oficiais ou artigos (ex: Martin Fowler).
5. HASHTAGS: 4-5 hashtags em inglês.

REGRAS DE ESTILO (Otimizado para Leitura Mobile):
• Idioma: {language}
• Escaneabilidade: MÁXIMO de 3 a 4 linhas por parágrafo.
• Tom: Profissional, mas conversacional.
• Emojis: Use no máximo 2, apenas para dar ênfase visual.

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
                    time.sleep(retry_seconds)
                    continue

                if retry_seconds is not None:
                    raise RuntimeError(f"Cota temporária excedida para {kind} '{model_name}'.")

                raise RuntimeError(f"Cota excedida para {kind} '{model_name}'.")

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
            mime_type = getattr(inline_data, "mime_type", "image/png")
            payload = getattr(inline_data, "data", None)
            if payload is None and isinstance(inline_data, dict):
                payload = inline_data.get("data")
            if payload is None:
                continue
            image_bytes = _decode_inline_data(payload)
            if image_bytes:
                return image_bytes, mime_type
    return None


def _file_extension_for_mime(mime_type: str) -> str:
    mapping = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
    return mapping.get(mime_type, ".png")


def _build_visual_prompt(post_text: str, raw_log_summary: str, variant: int) -> str:
    """
    Usa a IA de Texto (Gemini) para ler o post gerado e criar uma descrição
    visual curta (em inglês) para a IA de Imagem (Imagen).
    """
    style = config.VISUAL_ASSET_STYLE
    instructions = (
        "You are an expert AI image prompt engineer. Based on the following LinkedIn post about software engineering, "
        "write a highly descriptive image generation prompt in ENGLISH. "
        f"Style: {style} (modern, conceptual, high quality). "
        "CRITICAL: Do not include any text, letters, words, code, or logos in the image. "
        f"Make this variant #{variant} slightly unique in camera angle or colors. "
        "Must be under 400 characters. Respond ONLY with the prompt, nothing else.\n\n"
        f"Post Context:\n{post_text[:1500]}"
    )
    
    try:
        # Chama a API de TEXTO para gerar a descrição
        response = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=instructions,
            config=types.GenerateContentConfig(safety_settings=_SAFETY_SETTINGS)
        )
        # Limita a 450 caracteres para garantir que o Imagen 4 não dê erro 400
        return response.text.strip()[:450]
    except Exception as e:
        print(f"[Aviso] Falha ao gerar prompt dinâmico, usando genérico: {e}")
        return f"Abstract conceptual software engineering {style}, glowing data streams, dark theme, high quality digital art, no text"


def _image_model_candidates() -> list[str]:
    candidates = [config.GEMINI_IMAGE_MODEL, *config.GEMINI_IMAGE_FALLBACK_MODELS]
    unique_candidates: list[str] = []
    for model in candidates:
        if model and model not in unique_candidates:
            unique_candidates.append(model)
    return unique_candidates


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
    if not config.ENABLE_VISUAL_ASSETS:
        return []

    attempts: list[str] = []

    for model_name in _image_model_candidates():
        assets: list[dict] = []
        try:
            for idx in range(1, config.VISUAL_ASSET_COUNT + 1):
                # 1. Cria a descrição curta usando o Gemini
                prompt = _build_visual_prompt(post_text, raw_log_summary, variant=idx)
                print(f"🎨 Prompt traduzido para a imagem ({len(prompt)} chars): '{prompt}'")

                # 2. Envia a descrição curta para o Imagen ou Flash Image
                # ─── BIFURCAÇÃO DA API: Imagen vs Gemini ───
                if "imagen" in model_name.lower():
                    # Força o prompt a ser menor (250 chars) para evitar rejeição por tamanho
                    safe_prompt = prompt[:250]
                    print(f"🎨 Enviando para o Imagen (cortado por segurança): '{safe_prompt}'")
                    
                    result = _call_with_retry(
                        lambda: client.models.generate_images(
                            model=model_name,
                            prompt=safe_prompt,
                            config=types.GenerateImagesConfig(
                                number_of_images=1
                                # Removemos o aspect_ratio="16:9" que causa erro 400 em contas gratuitas/preview.
                                # O Imagen vai gerar uma imagem quadrada (1:1) nativamente.
                            )
                        ),
                        context="geração visual (Imagen)",
                        model_name=model_name,
                        kind="modelo visual",
                        retry_on_429=True,
                    )
                    
                    if not result.generated_images:
                        raise RuntimeError("Modelo Imagen não retornou imagens.")
                        
                    image_bytes = result.generated_images[0].image.image_bytes
                    mime_type = "image/png"
                else:
                    response = _call_with_retry(
                        lambda: client.models.generate_content(
                            model=model_name,
                            contents=prompt,
                            config=types.GenerateContentConfig(
                                response_modalities=["IMAGE", "TEXT"],
                                safety_settings=_SAFETY_SETTINGS,
                            ),
                        ),
                        context="geração visual (Gemini)",
                        model_name=model_name,
                        kind="modelo visual",
                        retry_on_429=True,
                    )

                    image_payload = _extract_inline_image(response)
                    if not image_payload:
                        raise RuntimeError("Modelo Gemini retornou sem imagem inline.")
                    image_bytes, mime_type = image_payload

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