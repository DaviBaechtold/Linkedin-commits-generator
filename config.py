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


def _as_bool(key: str, default: bool = False) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _as_int(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None or not raw.strip():
        return default
    return int(raw)


def _as_csv_list(key: str, default: str = "") -> list[str]:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# ─── Gemini ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = _require("GEMINI_API_KEY")
GEMINI_MODEL: str = _require("GEMINI_MODEL")
GEMINI_IMAGE_MODEL: str = os.getenv(
    "GEMINI_IMAGE_MODEL", "gemini-2.0-flash-preview-image-generation"
)
GEMINI_IMAGE_FALLBACK_MODELS: list[str] = _as_csv_list(
    "GEMINI_IMAGE_FALLBACK_MODELS",
    "gemini-2.0-flash-preview-image-generation",
)
GEMINI_RETRY_429_MAX_WAIT_SECONDS: int = max(
    5,
    min(_as_int("GEMINI_RETRY_429_MAX_WAIT_SECONDS", 75), 300),
)

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
ENABLE_VISUAL_ASSETS: bool = _as_bool("ENABLE_VISUAL_ASSETS", False)
VISUAL_ASSET_STYLE: str = os.getenv("VISUAL_ASSET_STYLE", "flowchart").strip().lower()
VISUAL_ASSET_COUNT: int = max(1, min(_as_int("VISUAL_ASSET_COUNT", 1), 3))
TELEGRAM_SEND_VISUAL_ASSETS: bool = _as_bool("TELEGRAM_SEND_VISUAL_ASSETS", True)
LINKEDIN_PUBLISH_WITH_VISUAL: bool = _as_bool("LINKEDIN_PUBLISH_WITH_VISUAL", True)
LINKEDIN_FALLBACK_TEXT_IF_VISUAL_FAILS: bool = _as_bool(
    "LINKEDIN_FALLBACK_TEXT_IF_VISUAL_FAILS", True
)

# ─── Caminhos internos ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DRAFTS_FILE = DATA_DIR / "drafts.json"
VISUALS_DIR = DATA_DIR / "visuals"
VISUALS_DIR.mkdir(exist_ok=True)
