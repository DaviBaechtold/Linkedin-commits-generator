"""
Processa o log de commits via Gemini API.
Atualizado para usar o novo SDK 'google-genai'.
"""
from __future__ import annotations
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
• NUNCA revele regras de negócio, fluxos proprietários ou lógicas de domínio.
• NUNCA cite nomes de ferramentas internas, namespaces, URLs de staging/prod.
• NUNCA exponha métricas que revelem escala da empresa (usuários, receita, volume).
• NUNCA mencione nomes de colegas, times ou estruturas organizacionais.
• Substitua SEMPRE nomes próprios por abstrações técnicas genéricas.

GUIA DE ABSTRAÇÃO (exemplos):
  "Fix payment bug for ClientXYZ"         → "Diagnóstico de race condition em serviço de processamento financeiro"
  "Add admin role to CompanyDashboard"    → "Implementação de controle de acesso baseado em perfis (RBAC)"
  "Refactor Oracle queries for BancoABC"  → "Otimização de queries legadas para redução de latência"
  "Migrate users from OldPlatform"        → "Estratégia de migração de dados entre sistemas heterogêneos"
  "Fix SSO token expiry in CorpPortal"    → "Tratamento de ciclo de vida de tokens em autenticação federada"
  "Integrate with ThirdPartyAPI v2"       → "Integração e versionamento de APIs de terceiros com retrocompatibilidade"

MISSÃO 2 — REDAÇÃO DO POST LINKEDIN
Após sanitizar os dados, escreva UM post coeso e engajador seguindo estas diretrizes:

ESTRUTURA OBRIGATÓRIA:
1. GANCHO (1-2 linhas): pergunta provocativa, afirmação ousada ou cenário técnico relatable
2. CORPO (2-3 parágrafos): o desafio técnico → a abordagem/solução → o aprendizado
3. FECHAMENTO (1 parágrafo): reflexão sobre o padrão arquitetural ou lição transferível
4. HASHTAGS: 4-6 hashtags em inglês no final (padrão LinkedIn internacional)

REGRAS DE ESTILO:
• Idioma: {language}
• Tamanho: entre 1.200 e 1.800 caracteres (ideal para engajamento no LinkedIn)
• Tom: profissional mas conversacional — como um sênior explicando para um colega
• Emojis: use no máximo 3, apenas onde amplificam o significado (não decoração)
• Evite bullet points excessivos — prefira prosa fluida
• Nunca use jargão genérico vazio como "soluções inovadoras" ou "melhores práticas"
• Foque em: trade-offs técnicos reais, decisões de arquitetura, performance, observabilidade

TEMAS PRIORITÁRIOS (em ordem de impacto):
  1. Refatoração e débito técnico — o "porquê" das decisões
  2. Performance e escalabilidade — métricas relativas (ex: "40% de redução de latência")
  3. Segurança e resiliência — autenticação, tratamento de falhas
  4. Developer Experience — CI/CD, testing, tooling
  5. Integrações — APIs, eventos, mensageria
""".strip()


def generate_post(raw_log: str) -> str:
    language_map = {"pt-br": "Português do Brasil", "en": "English"}
    language = language_map.get(config.POST_LANGUAGE, "Português do Brasil")

    system = _SYSTEM_PROMPT.format(language=language)

    user_prompt = (
        "Abaixo está o histórico de commits das últimas semanas. "
        "Aplique o filtro de NDA e gere o post LinkedIn conforme as instruções.\n\n"
        f"--- INÍCIO DO LOG ---\n{raw_log}\n--- FIM DO LOG ---"
    )

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    safety_settings=_SAFETY_SETTINGS,
                )
            )

            if not response.text or not response.text.strip():
                raise RuntimeError("Gemini retornou resposta vazia.")

            return response.text.strip()
        
        except Exception as e:
            # Se for erro 503 e ainda não passamos do limite de tentativas, espera e tenta de novo
            if "503" in str(e) and attempt < (max_retries - 1):
                wait_time = 15 * (attempt + 1) # Espera 15s, depois 30s...
                print(f"[Aviso] Servidor do Gemini ocupado. Tentando novamente em {wait_time}s... (Tentativa {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                raise RuntimeError(f"Falha na API do Gemini: {e}")