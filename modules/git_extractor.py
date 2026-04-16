"""
Extrai o histórico de commits dos repositórios locais configurados.

Princípio de segurança:
- Nunca lê o conteúdo dos arquivos (git diff/show).
- Extrai apenas: hash curto, data, mensagem de commit e nome do repositório.
- O nome do repositório é substituído por um índice genérico antes de sair
  deste módulo, garantindo que nomes internos não vazem para a IA.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import config


@dataclass
class CommitEntry:
    short_hash: str
    date: str
    message: str
    repo_alias: str  # "Repo-1", "Repo-2", etc. — nunca o nome real


@dataclass
class ExtractionResult:
    commits: list[CommitEntry] = field(default_factory=list)
    total_repos_scanned: int = 0
    repos_with_activity: int = 0


def _run_git_log(repo_path: Path, author: str, since: str) -> list[str]:
    """Executa git log e retorna as linhas brutas."""
    cmd = [
        "git",
        "-C", str(repo_path),
        "log",
        f"--author={author}",
        f"--since={since}",
        "-n", "30",             # máximo 30 commits por repositório
        "--no-merges",
        "--format=%h|%ad|%s",   # hash|data|assunto
        "--date=short",
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        # Repositório inválido ou sem histórico — não levanta exceção, apenas loga
        return []
    return [line for line in result.stdout.strip().splitlines() if line]


def _parse_line(line: str, repo_alias: str) -> CommitEntry | None:
    parts = line.split("|", maxsplit=2)
    if len(parts) != 3:
        return None
    short_hash, date, message = parts
    return CommitEntry(
        short_hash=short_hash.strip(),
        date=date.strip(),
        message=message.strip(),
        repo_alias=repo_alias,
    )


def extract() -> ExtractionResult:
    """
    Itera sobre todos os repositórios configurados e coleta os commits
    do autor no período definido.

    Retorna um ExtractionResult com commits ordenados do mais recente ao mais antigo.
    """
    result = ExtractionResult()

    for idx, repo_path in enumerate(config.REPO_PATHS, start=1):
        alias = f"Repo-{idx}"
        result.total_repos_scanned += 1

        lines = _run_git_log(repo_path, config.GIT_AUTHOR_NAME, config.GIT_SINCE)
        if not lines:
            continue

        result.repos_with_activity += 1
        for line in lines:
            entry = _parse_line(line, alias)
            if entry:
                result.commits.append(entry)

    # Ordena por data decrescente
    result.commits.sort(key=lambda c: c.date, reverse=True)
    return result


def format_for_prompt(result: ExtractionResult) -> str:
    """
    Serializa os commits em texto legível para o prompt do Gemini.
    Usa apenas dados já anonimizados (alias do repo, sem código).
    """
    if not result.commits:
        return "(nenhum commit encontrado no período)"

    lines = [
        f"Total de commits: {len(result.commits)} "
        f"em {result.repos_with_activity} repositório(s) ativos\n"
    ]
    current_repo = None
    for c in result.commits:
        if c.repo_alias != current_repo:
            current_repo = c.repo_alias
            lines.append(f"\n### {c.repo_alias}")
        lines.append(f"  [{c.date}] {c.message}")

    return "\n".join(lines)
