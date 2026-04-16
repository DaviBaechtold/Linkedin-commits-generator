#!/usr/bin/env python3
"""
linkedin_auth.py — Fluxo OAuth 2.0 one-time para obter o access token do LinkedIn.

Execute UMA VEZ para gerar o token. Depois coloque-o no .env como LINKEDIN_ACCESS_TOKEN.
O token é válido por 60 dias. Rode novamente quando expirar.

Pré-requisitos:
  1. App criado em https://developer.linkedin.com
  2. Produto "Share on LinkedIn" adicionado ao app
  3. Redirect URL configurada como: http://localhost:8080/callback
  4. LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET no .env

Uso:
  python3 linkedin_auth.py
"""
import http.server
import secrets
import threading
import urllib.parse
import webbrowser
from urllib.parse import urlencode

import os

import requests
from dotenv import load_dotenv

load_dotenv()

def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(f"Variável ausente no .env: '{key}'")
    return value

_REDIRECT_URI = "http://localhost:8080/callback"
_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
_SCOPES = "openid profile w_member_social"


class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    """Servidor HTTP temporário que captura o callback OAuth."""

    auth_code: str | None = None
    state_received: str | None = None

    def do_GET(self):  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        _CallbackHandler.auth_code = params.get("code", [None])[0]
        _CallbackHandler.state_received = params.get("state", [None])[0]

        if _CallbackHandler.auth_code:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"""
                <html><body style="font-family:sans-serif;text-align:center;padding:60px">
                <h2>&#10003; Autoriza&ccedil;&atilde;o conclu&iacute;da!</h2>
                <p>Pode fechar esta aba e voltar ao terminal.</p>
                </body></html>
            """)
        else:
            error = params.get("error_description", ["Erro desconhecido"])[0]
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"<html><body><h2>Erro: {error}</h2></body></html>".encode())

    def log_message(self, *args):
        pass  # Silencia logs do servidor HTTP


def _exchange_code(code: str) -> dict:
    resp = requests.post(
        _TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": _REDIRECT_URI,
            "client_id": _require("LINKEDIN_CLIENT_ID"),
            "client_secret": _require("LINKEDIN_CLIENT_SECRET"),
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def main():
    state = secrets.token_urlsafe(16)

    auth_params = {
        "response_type": "code",
        "client_id": _require("LINKEDIN_CLIENT_ID"),
        "redirect_uri": _REDIRECT_URI,
        "state": state,
        "scope": _SCOPES,
        "prompt": "consent",  # força re-autorização mesmo com sessão ativa
    }
    auth_url = f"{_AUTH_URL}?{urlencode(auth_params)}"

    # Inicia servidor local em thread separada
    server = http.server.HTTPServer(("localhost", 8080), _CallbackHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    print("\n" + "═" * 60)
    print("  LinkedIn OAuth 2.0 — Obtenção do Access Token")
    print("═" * 60)
    print("\n1. Uma janela do navegador será aberta.")
    print("2. Faça login no LinkedIn e autorize o app.")
    print("3. O token será exibido aqui automaticamente.\n")
    print("Se o navegador não abrir, acesse manualmente:")
    print(f"\n  {auth_url}\n")

    webbrowser.open(auth_url)

    print("Aguardando autorização...")
    thread.join(timeout=120)
    server.server_close()

    if not _CallbackHandler.auth_code:
        print("\n❌ Timeout: nenhum código recebido em 2 minutos.")
        return

    if _CallbackHandler.state_received != state:
        print("\n❌ State mismatch — possível ataque CSRF. Abortando.")
        return

    print("Código de autorização recebido. Trocando por access token...")

    try:
        token_data = _exchange_code(_CallbackHandler.auth_code)
    except requests.HTTPError as e:
        print(f"\n❌ Erro ao trocar o código: {e}")
        return

    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in", 0)
    expires_days = expires_in // 86400

    print("\n" + "═" * 60)
    print("  ✅ Token obtido com sucesso!")
    print("═" * 60)
    print(f"\nVálido por: ~{expires_days} dias\n")
    print("Adicione ao seu .env:")
    print(f"\n  LINKEDIN_ACCESS_TOKEN={access_token}\n")
    print("─" * 60)
    print("⚠️  Nunca compartilhe este token. Ele dá acesso total")
    print("    para postar em seu LinkedIn.")
    print("─" * 60 + "\n")


if __name__ == "__main__":
    main()
