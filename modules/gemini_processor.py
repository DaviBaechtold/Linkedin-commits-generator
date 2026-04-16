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
• NUNCA revele regras de negócio, fluxos proprietários, cenários específicos do cliente ou lógicas de domínio.
• NUNCA cite nomes de ferramentas internas, namespaces, URLs de staging/prod.
• Substitua SEMPRE nomes próprios e cenários de uso por abstrações técnicas genéricas.

GUIA DE ABSTRAÇÃO (exemplos):
  "Fix payment bug for ClientXYZ"         → "Diagnóstico de race condition em processamento assíncrono"
  "Refactor Oracle queries for BancoABC"  → "Otimização de queries legadas para redução de latência"
  "Facial recognition in tennis courts"   → "Análise de performance de visão computacional em ambientes abertos dinâmicos"

MISSÃO 2 — REDAÇÃO DO POST LINKEDIN
Após sanitizar os dados, escreva UM post coeso e engajador seguindo estas diretrizes:

ESTRUTURA OBRIGATÓRIA:
1. GANCHO (1-2 linhas): Uma pergunta provocativa, afirmação ousada ou cenário técnico com o qual outros devs se identifiquem.
2. O DESAFIO TÉCNICO (Storytelling): O que estava em jogo? Qual era a dificuldade (abstraída)? 
3. A ABORDAGEM E APRENDIZADO: Como o problema foi resolvido e qual lição de arquitetura ou engenharia ficou.
4. REFERÊNCIAS DE ESTUDO (Anti-Alucinação): Adicione uma breve seção recomendando 1 ou 2 fontes de estudo. IMPORTANTE: Não invente URLs profundas. Forneça apenas o domínio raiz oficial (ex: docs.aws.amazon.com) ou recomende os termos exatos de busca (ex: "Pesquise por 'Machine Learning Evaluation Metrics' no blog do Martin Fowler").
5. HASHTAGS: 4-5 hashtags em inglês.

REGRAS DE ESTILO (Otimizado para Leitura Mobile):
• Idioma: {language}
• Escaneabilidade: MÁXIMO de 3 a 4 linhas por parágrafo. Use quebras de linha para dar respiro à leitura.
• Tom: Profissional, mas conversacional — como um sênior trocando ideia no Slack.
• Emojis: Use no máximo 2, apenas para dar ênfase visual.
• Proibido: Jargões de marketing vazios ("soluções inovadoras", "quebrando paradigmas"). Foque no trade-off técnico.

OUTPUT: Apenas o texto do post, sem prefácio, sem explicações extras.
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