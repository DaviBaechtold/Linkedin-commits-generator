export interface GitHubCommit {
  sha: string;
  date: string;
  message: string;
  repo_alias: string;
}

export interface GitHubRepo {
  full_name: string;
  name: string;
  private: boolean;
}

/** Lista repos do usuário via GitHub API */
export async function listUserRepos(
  accessToken: string
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!res.ok) break;
    const data: { full_name: string; name: string; private: boolean }[] =
      await res.json();
    if (data.length === 0) break;

    repos.push(
      ...data.map((r) => ({
        full_name: r.full_name,
        name: r.name,
        private: r.private,
      }))
    );

    if (data.length < 100) break;
    page++;
  }

  return repos;
}

/** Busca commits de um repo filtrados por autor e data */
export async function fetchCommits(
  accessToken: string,
  fullName: string,
  alias: string,
  sinceDate: Date,
  authorLogin?: string
): Promise<GitHubCommit[]> {
  const url = new URL(
    `https://api.github.com/repos/${fullName}/commits`
  );
  url.searchParams.set("since", sinceDate.toISOString());
  url.searchParams.set("per_page", "50");
  if (authorLogin) url.searchParams.set("author", authorLogin);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((c: Record<string, unknown>) => ({
    sha: (c.sha as string).slice(0, 7),
    date: (c.commit as Record<string, unknown>)?.author
      ? ((c.commit as Record<string, Record<string, string>>).author.date)
      : new Date().toISOString(),
    message: (c.commit as Record<string, string>)?.message?.split("\n")[0] ?? "",
    repo_alias: alias,
  }));
}

/** Formata commits para o prompt do Gemini (sem expor nome real do repo) */
export function formatCommitsForPrompt(commits: GitHubCommit[]): string {
  if (commits.length === 0) return "Nenhum commit encontrado no período.";

  return commits
    .map(
      (c) =>
        `[${c.repo_alias}] ${c.sha} (${c.date.slice(0, 10)}): ${c.message}`
    )
    .join("\n");
}
