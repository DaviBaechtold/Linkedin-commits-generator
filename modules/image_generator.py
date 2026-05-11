"""
Geração de imagens via Pollinations.ai — 100% gratuito, sem API key.
Usa o modelo Flux internamente. Ideal para posts no LinkedIn.
"""
from __future__ import annotations

import time
import urllib.parse
from pathlib import Path

import requests

import config

_BASE_URL = "https://image.pollinations.ai/prompt"

_STYLE_SUFFIXES = {
    "illustration": "flat vector illustration, vibrant colors, clean composition, no text, no letters, no words",
    "minimal":      "minimalist design, white background, simple geometric shapes, no text, no letters",
    "dark":         "dark theme, neon glow, futuristic tech aesthetic, no text, no letters",
    "flowchart":    "clean infographic style, soft gradient background, modern diagram aesthetic, no text, no letters",
}

# Palavras-chave do post → conceito visual correspondente
_KEYWORD_MAP = [
    (["reconhecimento facial", "facial recognition", "face", "rosto"],
     "abstract face detection neural network, glowing facial geometry, biometric scanning visualization"),
    (["visão computacional", "computer vision", "imagem", "câmera", "detecção"],
     "abstract computer vision pipeline, geometric eye with data streams, optical analysis visualization"),
    (["machine learning", "modelo", "treinamento", "dataset", "inferência"],
     "neural network nodes glowing, abstract AI brain with data flow, deep learning visualization"),
    (["api", "integração", "endpoint", "microserviço", "microsserviço"],
     "interconnected API nodes, abstract service mesh, glowing network endpoints"),
    (["performance", "latência", "otimização", "escalabilidade", "cache"],
     "abstract speed optimization, glowing performance metrics, acceleration data visualization"),
    (["autenticação", "segurança", "token", "oauth", "jwt", "rbac"],
     "abstract digital security shield, glowing lock with data streams, cybersecurity visualization"),
    (["banco de dados", "database", "sql", "query", "migração"],
     "abstract database architecture, glowing data cylinders, structured data flow visualization"),
    (["mobile", "app", "frontend", "interface", "ui", "ux"],
     "abstract mobile app interface, glowing screen with geometric UI elements, modern app design"),
    (["arquitetura", "refatoração", "padrão", "design pattern", "débito técnico"],
     "abstract software architecture blueprint, geometric building blocks, clean system design"),
    (["pipeline", "ci/cd", "deploy", "docker", "kubernetes"],
     "abstract deployment pipeline, glowing containers and workflow nodes, DevOps visualization"),
]


def _build_prompt(post_text: str, style: str) -> str:
    """Cria um prompt visual baseado no conteúdo real do post."""
    suffix = _STYLE_SUFFIXES.get(style, _STYLE_SUFFIXES["illustration"])
    post_lower = post_text.lower()

    # Detecta o tema principal do post
    visual_concept = None
    for keywords, concept in _KEYWORD_MAP:
        if any(kw in post_lower for kw in keywords):
            visual_concept = concept
            break

    if not visual_concept:
        visual_concept = "abstract software engineering concept, geometric code architecture, digital innovation visualization"

    return f"{visual_concept}, {suffix}"[:400]


def generate(
    post_text: str,
    draft_id: str,
    style: str | None = None,
) -> Path:
    """
    Gera uma imagem e salva em data/visuals/<draft_id>.jpg.

    Returns:
        Path para o arquivo salvo.

    Raises:
        RuntimeError: se a geração falhar após retries.
    """
    style = style or config.VISUAL_ASSET_STYLE
    prompt = _build_prompt(post_text, style)
    encoded_prompt = urllib.parse.quote(prompt)

    url = (
        f"{_BASE_URL}/{encoded_prompt}"
        f"?width=1080&height=1080&nologo=true&seed={int(time.time())}"
    )

    out_dir = config.VISUALS_DIR
    out_path = out_dir / f"{draft_id}.jpg"

    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=60, stream=True)
            resp.raise_for_status()

            content_type = resp.headers.get("content-type", "")
            if "image" not in content_type:
                raise RuntimeError(
                    f"Resposta inesperada do Pollinations: content-type={content_type}"
                )

            with open(out_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)

            size_kb = out_path.stat().st_size // 1024
            print(f"Imagem gerada: {out_path} ({size_kb} KB)")
            return out_path

        except requests.RequestException as e:
            if attempt < 2:
                print(f"[Aviso] Tentativa {attempt + 1}/3 falhou: {e}. Tentando novamente...")
                time.sleep(5)
            else:
                raise RuntimeError(f"Falha ao gerar imagem após 3 tentativas: {e}")

    raise RuntimeError("Falha inesperada na geração de imagem.")
