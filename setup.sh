#!/usr/bin/env bash
# setup.sh — Configuração completa do ambiente
# Uso: bash setup.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/.venv"
PYTHON="python3"
SERVICE_NAME="linkedin-branding-bot"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  LinkedIn Personal Branding — Setup"
echo "══════════════════════════════════════════════════════"
echo ""

# ── 1. Verifica Python 3.10+ ──────────────────────────────────────────────────
PY_VERSION=$($PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
if [[ "$PY_MAJOR" -lt 3 || ("$PY_MAJOR" -eq 3 && "$PY_MINOR" -lt 10) ]]; then
  echo "❌ Python 3.10+ necessário. Encontrado: $PY_VERSION"
  exit 1
fi
echo "✔ Python $PY_VERSION encontrado"

# ── 2. Cria virtualenv ────────────────────────────────────────────────────────
if [[ ! -d "$VENV_DIR" ]]; then
  echo "→ Criando virtualenv em .venv..."
  $PYTHON -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"
echo "✔ Virtualenv ativado"

# ── 3. Instala dependências ───────────────────────────────────────────────────
echo "→ Instalando dependências..."
pip install --quiet --upgrade pip
pip install --quiet -r "$PROJECT_DIR/requirements.txt"
echo "✔ Dependências instaladas"

# ── 4. Copia .env.example se .env não existir ─────────────────────────────────
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo ""
  echo "⚠️  Arquivo .env criado a partir do .env.example"
  echo "   Edite $PROJECT_DIR/.env com suas credenciais antes de continuar."
  echo ""
fi

# ── 5. Cria diretório de logs e data ──────────────────────────────────────────
mkdir -p "$PROJECT_DIR/logs" "$PROJECT_DIR/data"
echo "✔ Diretórios logs/ e data/ criados"

# ── 6. Cria serviço systemd para o bot daemon ─────────────────────────────────
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SYSTEMD_USER_DIR/$SERVICE_NAME.service"

mkdir -p "$SYSTEMD_USER_DIR"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=LinkedIn Personal Branding Bot (Telegram Approval Daemon)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStart=$VENV_DIR/bin/python3 $PROJECT_DIR/bot.py
Restart=on-failure
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/bot.log
StandardError=append:$PROJECT_DIR/logs/bot.log
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
EOF

echo "✔ Serviço systemd criado: $SERVICE_FILE"

# ── 7. Habilita e inicia o serviço ────────────────────────────────────────────
if command -v systemctl &>/dev/null; then
  systemctl --user daemon-reload
  systemctl --user enable "$SERVICE_NAME"
  echo "✔ Serviço '$SERVICE_NAME' habilitado (inicia com o login)"
  echo ""
  echo "  Para iniciar agora:   systemctl --user start $SERVICE_NAME"
  echo "  Para ver status:      systemctl --user status $SERVICE_NAME"
  echo "  Para ver logs:        tail -f $PROJECT_DIR/logs/bot.log"
fi

# ── 8. Configura o cron (quinzenal: dias 1 e 15 de cada mês, às 09h) ─────────
CRON_CMD="0 9 1,15 * * cd $PROJECT_DIR && $VENV_DIR/bin/python3 $PROJECT_DIR/generate.py >> $PROJECT_DIR/logs/generate.log 2>&1"
CRON_COMMENT="# linkedin-branding-generate"

EXISTING_CRON=$(crontab -l 2>/dev/null || true)

if echo "$EXISTING_CRON" | grep -q "linkedin-branding-generate"; then
  echo "✔ Cron já configurado (sem alterações)"
else
  (echo "$EXISTING_CRON"; echo "$CRON_COMMENT"; echo "$CRON_CMD") | crontab -
  echo "✔ Cron configurado (dias 1 e 15 de cada mês, às 09:00)"
fi

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Próximos passos:"
echo "══════════════════════════════════════════════════════"
echo ""
echo "  1. Edite o .env com suas credenciais (se ainda não fez)"
echo "  2. Obtenha o token LinkedIn:"
echo "     $VENV_DIR/bin/python3 $PROJECT_DIR/linkedin_auth.py"
echo "  3. Coloque o token no .env como LINKEDIN_ACCESS_TOKEN"
echo "  4. Inicie o bot daemon:"
echo "     systemctl --user start $SERVICE_NAME"
echo "  5. Teste a geração manualmente:"
echo "     $VENV_DIR/bin/python3 $PROJECT_DIR/generate.py"
echo ""
