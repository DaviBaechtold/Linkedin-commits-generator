"""
Publica posts no LinkedIn via UGC Posts API (v2).

Endpoint: POST https://api.linkedin.com/v2/ugcPosts
Escopo necessário: w_member_social

Fluxo de autenticação: veja linkedin_auth.py para geração do access token.

Referência: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
"""
from __future__ import annotations

import mimetypes
from pathlib import Path

import requests

import config

_API_BASE = "https://api.linkedin.com/v2"


def _headers() -> dict:
    if not config.LINKEDIN_ACCESS_TOKEN:
        raise EnvironmentError(
            "LINKEDIN_ACCESS_TOKEN não configurado.\n"
            "Execute linkedin_auth.py primeiro para obter o token."
        )
    return {
        "Authorization": f"Bearer {config.LINKEDIN_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202406",
    }


def _get_user_urn() -> str:
    """
    Obtém o URN do usuário via /v2/userinfo (escopo: openid + profile).
    Fallback para LINKEDIN_PERSON_ID no .env se a chamada falhar.
    """
    if config.LINKEDIN_PERSON_ID:
        return f"urn:li:person:{config.LINKEDIN_PERSON_ID}"

    resp = requests.get(
        f"{_API_BASE}/userinfo",
        headers=_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    sub = data.get("sub")
    if not sub:
        raise RuntimeError(f"Não foi possível obter o user URN. Resposta: {data}")
    return f"urn:li:person:{sub}"


def _register_image_upload(author_urn: str) -> tuple[str, str]:
    payload = {
        "registerUploadRequest": {
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "owner": author_urn,
            "serviceRelationships": [
                {
                    "relationshipType": "OWNER",
                    "identifier": "urn:li:userGeneratedContent",
                }
            ],
        }
    }

    resp = requests.post(
        f"{_API_BASE}/assets?action=registerUpload",
        headers=_headers(),
        json=payload,
        timeout=20,
    )
    resp.raise_for_status()

    data = resp.json().get("value", {})
    upload_mechanism = data.get("uploadMechanism", {}).get(
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {}
    )
    upload_url = upload_mechanism.get("uploadUrl")
    asset_urn = data.get("asset")

    if not upload_url or not asset_urn:
        raise RuntimeError(
            "LinkedIn não retornou uploadUrl/asset para imagem. "
            f"Resposta: {resp.text}"
        )

    return upload_url, asset_urn


def _upload_image(author_urn: str, image_path: str) -> str:
    path = Path(image_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Imagem não encontrada para upload: {image_path}")

    upload_url, asset_urn = _register_image_upload(author_urn)
    content_type = mimetypes.guess_type(path.name)[0] or "image/png"

    with open(path, "rb") as f:
        upload_resp = requests.put(
            upload_url,
            data=f,
            headers={"Content-Type": content_type},
            timeout=60,
        )

    if upload_resp.status_code not in (200, 201):
        raise requests.HTTPError(
            f"Falha no upload da imagem ({upload_resp.status_code}): {upload_resp.text}",
            response=upload_resp,
        )

    return asset_urn


def publish(post_text: str, image_path: str | None = None) -> str:
    """
    Cria um post no LinkedIn (texto simples ou texto + imagem).

    Args:
        post_text: Texto completo do post (já aprovado pelo usuário).
        image_path: Caminho opcional para imagem local a anexar no post.

    Returns:
        URN do post criado (ex: "urn:li:share:12345678").

    Raises:
        requests.HTTPError: em caso de erro na API.
        RuntimeError: se a resposta não contiver o URN esperado.
    """
    author_urn = _get_user_urn()

    if image_path:
        image_asset_urn = _upload_image(author_urn, image_path)
        share_content = {
            "shareCommentary": {"text": post_text},
            "shareMediaCategory": "IMAGE",
            "media": [
                {
                    "status": "READY",
                    "media": image_asset_urn,
                }
            ],
        }
    else:
        share_content = {
            "shareCommentary": {"text": post_text},
            "shareMediaCategory": "NONE",
        }

    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": share_content
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    resp = requests.post(
        f"{_API_BASE}/ugcPosts",
        headers=_headers(),
        json=payload,
        timeout=20,
    )

    if resp.status_code == 201:
        post_urn = resp.headers.get("x-restli-id") or resp.json().get("id", "")
        if not post_urn:
            raise RuntimeError(
                f"Post criado mas URN não encontrado nos headers/body.\n"
                f"Headers: {dict(resp.headers)}\nBody: {resp.text}"
            )
        return post_urn

    # Erro — levanta com detalhes da API
    try:
        error_detail = resp.json()
    except Exception:
        error_detail = resp.text

    raise requests.HTTPError(
        f"LinkedIn API retornou {resp.status_code}: {error_detail}",
        response=resp,
    )
