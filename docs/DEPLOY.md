# Deploy & CI/CD — CommitPost

## Estratégia de branches

| Branch | Ambiente | Deploy |
|---|---|---|
| `main` | **dev** | Preview na Vercel (URL única por push) |
| `prod` | **produção** | https://commitpost.vercel.app |

Fluxo de trabalho:

```
desenvolve → commit/push em main → CI + deploy de preview
                                          ↓ (quando validado)
                    git checkout prod && git merge main && git push
                                          ↓
                              CI + deploy de PRODUÇÃO
```

## Como funciona

- **GitHub Actions** controla todos os deploys (`.github/workflows/`):
  - `ci.yml` — typecheck + build em todo PR/push (main e prod).
  - `deploy.yml` — push em `main` → preview; push em `prod` → produção.
- O **auto-deploy nativo da Vercel está desligado** (`frontend/vercel.json` →
  `git.deploymentEnabled: false`), então não há deploy duplicado. O controle
  de versão dev/prod é explícito via branch.

## Secrets necessárias no GitHub

`Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Valor |
|---|---|
| `VERCEL_TOKEN` | Criar em https://vercel.com/account/tokens (scope: Full Account) |
| `VERCEL_ORG_ID` | `team_Ixbodl2uLyj4AVvt1lRxvf9v` |
| `VERCEL_PROJECT_ID` | `prj_8DT0otG7enqNkppBLJ3P5E62MGWh` |

> `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` já são configurados automaticamente.
> Só o `VERCEL_TOKEN` precisa ser criado manualmente.

## Promover dev → produção

```bash
git checkout prod
git merge main
git push origin prod        # dispara o deploy de produção
git checkout main
```

## Env vars

As env vars de runtime (Supabase, LinkedIn, CRON_SECRET, TOKEN_ENCRYPTION_KEY)
ficam na Vercel (Production + Preview). O `vercel pull` no workflow as baixa
no momento do build. Não vão para o GitHub.
