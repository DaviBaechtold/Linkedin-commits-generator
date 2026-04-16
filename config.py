"""
Centraliza todas as configurações lidas do .env.
Falha rápido (fail-fast) se variáveis obrigatórias estiverem ausentes.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(
            f"Variável de ambiente obrigatória ausente: '{key}'\n"
            f"Copie .env.example para .env e preencha os valores."
        )
    return value


def _repo_paths() -> list[Path]:
    raw = _require("REPO_PATHS")
    paths = [Path(p.strip()) for p in raw.split(",") if p.strip()]
    missing = [p for p in paths if not p.is_dir()]
    if missing:
        raise FileNotFoundError(
            f"Repositórios não encontrados: {[str(p) for p in missing]}"
        )
    return paths


# ─── Gemini ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = _require("GEMINI_API_KEY")
GEMINI_MODEL: str = _require("GEMINI_MODEL")

# ─── Telegram ──────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = _require("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID: int = int(_require("TELEGRAM_CHAT_ID"))

# ─── LinkedIn ──────────────────────────────────────────────────────────────────
LINKEDIN_CLIENT_ID: str = _require("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET: str = _require("LINKEDIN_CLIENT_SECRET")
LINKEDIN_ACCESS_TOKEN: str = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_PERSON_ID: str = os.getenv("LINKEDIN_PERSON_ID", "")

# ─── Git ───────────────────────────────────────────────────────────────────────
REPO_PATHS: list[Path] = _repo_paths()
GIT_AUTHOR_NAME: str = _require("GIT_AUTHOR_NAME")
GIT_SINCE: str = os.getenv("GIT_SINCE", "2 weeks ago")

# ─── Comportamento ─────────────────────────────────────────────────────────────
POST_LANGUAGE: str = os.getenv("POST_LANGUAGE", "pt-br")

# ─── Caminhos internos ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DRAFTS_FILE = DATA_DIR / "drafts.json"
