# Releasing the frontend

Pushing a semver tag (`X.Y.Z`) to `braghettos/krateo-frontend` triggers the
[`release-tag`](../.github/workflows/release-tag.yaml) workflow, which:

1. **`build`** — builds and pushes the multi-platform image to
   `ghcr.io/braghettos/krateo-frontend:X.Y.Z` (uses the default `GITHUB_TOKEN`).
2. **`crds`** — regenerates the widget CRDs from the TypeScript widget definitions
   via `krateoctl` (`npm run generate-crds`) and **opens a PR** that syncs them into
   [`braghettos/krateo-frontend-chart`](https://github.com/braghettos/krateo-frontend-chart)
   at `crds-subchart/templates/`.

To cut a release:

```bash
git tag 1.3.20 && git push origin 1.3.20
```

That is the whole happy path — the CRD sync PR against the chart repo opens
automatically. Review and merge it, then bump the frontend image/CRD versions
downstream as usual.

---

## One-time setup: the `PAT` cross-repo secret

> **You only do this once.** After the secret exists, every future release
> auto-opens the CRD sync PR with no manual step.

### Why a PAT is required (the 401 root cause)

The `crds` job pushes a branch and opens a PR in a **different** repository
(`braghettos/krateo-frontend-chart`). GitHub Actions' built-in
`secrets.GITHUB_TOKEN` is automatically scoped to **only the repository the
workflow runs in** (`braghettos/krateo-frontend`). Using it to push/PR to another
repo returns **HTTP 401 “Bad credentials” / “Permission denied”**. That is the
cross-repo push failure this workflow is designed around — it is *not* a bug in
the script, it is a hard limitation of the default token.

The fix is a token that carries write permission on the **chart** repo, provided
to the workflow as the repository secret named **`PAT`**.

### Provision the token

Use a **fine-grained personal access token** (preferred) or a GitHub App
installation token. The token owner must have write access to
`braghettos/krateo-frontend-chart`.

**Fine-grained PAT** — https://github.com/settings/personal-access-tokens/new

| Setting                    | Value                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| **Resource owner**         | `braghettos`                                                          |
| **Repository access**      | *Only select repositories* → `braghettos/krateo-frontend-chart`       |
| **Repository permissions** | **Contents: Read and write** (push the `krateoctl-<tag>` branch)      |
|                            | **Pull requests: Read and write** (create / view / reopen the PR)     |
| **Expiration**             | Set a calendar reminder to rotate before it lapses                    |

No organization or account permissions are needed. Grant nothing beyond the two
repository permissions above — the workflow only pushes a branch and opens a PR.

> If you use a **classic PAT** instead, the equivalent scope is the full `repo`
> scope. Fine-grained is strongly preferred because it can be limited to the
> single chart repo with only these two permissions.

### Store it as the `PAT` secret

Add it to **this** repo (`braghettos/krateo-frontend`):

```bash
gh secret set PAT --repo braghettos/krateo-frontend
# paste the token value when prompted
```

Or via the UI: **Settings → Secrets and variables → Actions → New repository
secret**, name `PAT`.

The workflow reads it as `GH_TOKEN: ${{ secrets.PAT }}` in the
*Push CRDs …* step.

### Rotation

When the token expires, the `crds` job will **skip (not fail)** with a warning in
the run summary telling you to re-provision `PAT`. Re-run `gh secret set PAT …`
with a fresh token and re-run the workflow (or push the next tag).

---

## If the secret is missing (graceful degradation)

The *Push CRDs …* step is **gated** on `PAT`. If the secret is absent or empty:

- the release **does not fail** — the image still publishes;
- the step prints a `::warning::` and a run-summary block with the exact manual
  command;
- the freshly generated CRDs are attached to the run as the
  `frontend-crds-yaml-files` artifact.

To sync manually in that case:

```bash
npm run generate-crds
# copy scripts/krateoctl-output/*.yaml into
# braghettos/krateo-frontend-chart : crds-subchart/templates/
# then open a PR to that repo's main branch
```

Once `PAT` is in place, this manual step is never needed again.
