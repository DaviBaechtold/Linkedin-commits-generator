"""
Publica posts no LinkedIn via UGC Posts API (v2).

Endpoint: POST https://api.linkedin.com/v2/ugcPosts
Escopo necessário: w_member_social

Fluxo de autenticação: veja linkedin_auth.py para geração do access token.

Referência: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
"""
from __future__ import annotations

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


def publish(post_text: str) -> str:
    """
    Cria um post de texto simples no LinkedIn.

    Args:
        post_text: Texto completo do post (já aprovado pelo usuário).

    Returns:
        URN do post criado (ex: "urn:li:share:12345678").

    Raises:
        requests.HTTPError: em caso de erro na API.
        RuntimeError: se a resposta não contiver o URN esperado.
    """
    author_urn = _get_user_urn()

    payload = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": post_text
                },
                "shareMediaCategory": "NONE",
            }
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
