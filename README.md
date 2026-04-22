# LinkedIn Personal Branding Automation

Automação de **personal branding** para LinkedIn que transforma seu histórico de commits em posts engajadores, de forma segura e automatizada.

## 🎯 O Que Faz

1. **Extração local de commits** — varre seus repositórios locais (via `git log`)
2. **Geração inteligente com Gemini AI** — transforma commits em narrativa técnica, com filtro automático de NDA
3. **Visual opcional com modelo de imagem Google** — gera imagem/fluxograma para aumentar engajamento
4. **Aprovação humana via Telegram** — você revisa e aprova antes de publicar
5. **Publicação no LinkedIn** — posta direto na sua timeline pessoal (com fallback para texto)

## 🔐 Segurança & NDA

**Regra de Ouro:** nenhum código-fonte, nome de empresa, cliente ou informação confidencial vaza.

- ✅ Git log extraído **apenas via `git log --format=%h|%ad|%s`** (nunca `git diff`/`git show`)
- ✅ Repositórios anonimizados como "Repo-1", "Repo-2"
- ✅ System Prompt do Gemini com **6 regras inegociáveis** de sanitização
- ✅ Dados sensíveis abstraídos para "desafio técnico", "padrão arquitetural", "performance"

## 🛠️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Cron Job (Quinzenal)                     │
│                    generate.py (exit rápido)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   1. Git Log Extraction        │
        │   (git_extractor.py)           │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   2. Gemini AI (1.5-pro)       │
        │   (gemini_processor.py)        │
        │   + Super Prompt (NDA Filter)  │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   3. Draft Persistence         │
        │   (data/drafts.json)           │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   4. Telegram Inline Buttons   │
        │   (telegram_handler.py)        │
        └────────────────┬───────────────┘
                         │
        ┌────────────────┴───────────────┐
        │                                 │
        ▼                                 ▼
 ┌──────────────┐              ┌──────────────┐
 │  Bot Daemon  │              │  User Approves│
 │  (bot.py)    │◄─────────────│   (Telegram) │
 │  Long Polling│              └──────────────┘
 └──────┬───────┘
        │
        ▼
 ┌──────────────────────────┐
 │  LinkedIn API (v2)       │
 │  (linkedin_publisher.py) │
 └──────────────────────────┘
        │
        ▼
 ┌──────────────────────────┐
 │  Post Published 🎉       │
 └──────────────────────────┘
```

## 🚀 Quick Start

### 1. Clone e Setup

```bash
git clone https://github.com/DaviBaechtold/Linkedin-commits-generator.git
cd Linkedin-commits-generator
bash setup.sh
```

### 2. Configure o `.env`

```bash
cp .env.example .env
# Preencha: GEMINI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, 
# LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, REPO_PATHS, GIT_AUTHOR_NAME,
# GEMINI_MODEL
```

### 2.1 Ative o Modo Visual (Plano Gratuito)

```env
# Texto
GEMINI_MODEL=gemini-1.5-flash

# Imagem/fluxograma
ENABLE_VISUAL_ASSETS=true
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
GEMINI_IMAGE_FALLBACK_MODELS=gemini-2.5-flash-image,gemini-2.0-flash-preview-image-generation
GEMINI_RETRY_429_MAX_WAIT_SECONDS=75
VISUAL_ASSET_STYLE=flowchart
VISUAL_ASSET_COUNT=1

# Publicação
LINKEDIN_PUBLISH_WITH_VISUAL=true
LINKEDIN_FALLBACK_TEXT_IF_VISUAL_FAILS=true
```

Observações:
- O projeto segue funcionando mesmo se a geração visual falhar (publica texto normalmente).
- A disponibilidade do modelo visual depende da cota do plano gratuito no Gemini API.
- Alguns modelos preview de imagem podem ter cota gratuita zero em certas contas/projetos. Nesses casos, use fallback para um modelo com free tier ativo.

### 3. Obtenha o Token LinkedIn

```bash
source .venv/bin/activate
python3 linkedin_auth.py
# Cole o token no .env como LINKEDIN_ACCESS_TOKEN
```

### 4. Inicie o Bot (em terminal separado)

```bash
python3 bot.py
```

### 5. Teste a Geração

```bash
python3 generate.py
```

Clique em **🚀 Aprovar** no Telegram para publicar!

## ⏰ Automação via Cron

O `setup.sh` já configura:

```bash
# Dias 1 e 15 de cada mês, às 09:00
0 9 1,15 * * cd /path/to/project && .venv/bin/python3 generate.py >> logs/generate.log 2>&1

# Daemon persistente (systemd user service)
systemctl --user status linkedin-branding-bot
```

## 📝 Stack Tecnológico

- **Extração:** `GitPython`
- **IA (texto + visual):** `google-generativeai` (Gemini)
- **Telegram:** `python-telegram-bot` (Long Polling)
- **LinkedIn:** `requests` (UGC Posts API v2)
- **Orquestração:** `cron` + `systemd`

## 🔑 LinkedIn Developer Portal

1. [developer.linkedin.com](https://developer.linkedin.com) → Create App
2. Aba **Products** → adicione:
   - Share on LinkedIn
   - Sign In with LinkedIn using OpenID Connect
3. Aba **Auth** → Authorized Redirect URLs → `http://localhost:8080/callback`
4. Copie Client ID e Secret para o `.env`
5. Rode `python3 linkedin_auth.py`

## 📄 Licença

MIT

Made with ❤️ for secure personal branding
