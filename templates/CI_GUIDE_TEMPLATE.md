# CI Guide — POM Optional Continuous Integration

POM does not install or require a CI pipeline. This guide is a portable starting point that target projects may copy and adapt when they want automated checks on every push or pull request.

The guide is intentionally provider-agnostic: it lists what POM expects a CI run to cover, then shows minimal snippets for the most common providers. Drop the snippet that fits your project into its standard location and tune from there.

## What CI should cover

POM's recurring local commands are the natural unit of work for CI. Pick the subset that applies to your project; nothing here is mandatory.

| Step | When useful | Command |
|---|---|---|
| Documentation governance | Always, when POM is installed | `npm run pom:lint` |
| POM integration tests | When working inside the POM source repository (target projects normally skip this) | `npm run pom:test` |
| Wiki reader regeneration check | When `wiki/` is tracked and reader output is committed | `npm run pom:wiki:render && git diff --exit-code wiki/_site` |
| Type check (recommended, not imposed) | TypeScript projects with `tsconfig.json` | `npx tsc --noEmit` |
| Lint and format (recommended, not imposed) | JS/TS projects with a linter configured | `npm run lint` / `npx biome ci .` / `npx eslint .` |
| Project tests | When the project exposes its own test runner | `npm test` or equivalent |

A single failing step should fail the pipeline. CI is the safety net; do not make warnings invisible.

## Provider snippets

### GitHub Actions

Save as `.github/workflows/pom-ci.yml`:

```yaml
name: POM CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  pom-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      # Install dependencies. Use npm ci when package-lock.json is committed
      # (reproducible, faster), npm install when no lockfile exists. POM itself
      # ships without a lockfile because it has no runtime dependencies, so
      # inside the POM source repository this step can be skipped entirely.
      - run: npm install
      - name: POM documentation lint
        run: npm run pom:lint
      # Uncomment when working inside the POM source repository itself.
      # - name: POM integration tests
      #   run: npm run pom:test
      # Add the steps below only if the project has them configured.
      # - name: Type check
      #   run: npx tsc --noEmit
      # - name: Lint
      #   run: npm run lint
      # - name: Tests
      #   run: npm test
```

Use Node `22` so `--experimental-strip-types` runs the POM TypeScript scripts.

### GitLab CI

Save as `.gitlab-ci.yml` (or merge into your existing pipeline):

```yaml
stages:
  - check

pom-checks:
  stage: check
  image: node:22
  script:
    # Use 'npm ci' when a lockfile is committed, 'npm install' otherwise.
    - npm install
    - npm run pom:lint
    # - npx tsc --noEmit
    # - npm run lint
    # - npm test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'
```

### CircleCI

Save as `.circleci/config.yml`:

```yaml
version: 2.1

jobs:
  pom-checks:
    docker:
      - image: cimg/node:22.6
    steps:
      - checkout
      # Use 'npm ci' when a lockfile is committed, 'npm install' otherwise.
      - run: npm install
      - run: npm run pom:lint
      # - run: npx tsc --noEmit
      # - run: npm run lint
      # - run: npm test

workflows:
  on-push:
    jobs:
      - pom-checks
```

### Generic shell template

For Jenkins, Buildkite, Drone, or any runner that executes shell commands, the minimum POM check is:

```bash
#!/usr/bin/env bash
set -euo pipefail

node --version           # Expect v22.6 or higher
# Use 'npm ci' when package-lock.json is committed, 'npm install' otherwise.
# Inside the POM source repo there are no runtime dependencies, so this can be skipped.
npm install
npm run pom:lint
# Uncomment as the project adopts more guardrails:
# npx tsc --noEmit
# npm run lint
# npm test
```

## Adopting this guide

1. Copy the snippet that matches the project's CI provider to its standard location.
2. Keep only the steps the project already supports — never add a step whose command does not exist locally.
3. Choose the install command that matches your lockfile situation: `npm ci` when `package-lock.json` is committed (faster and reproducible), `npm install` when no lockfile is committed, or remove the install step entirely if your project has no `node_modules` dependencies (POM itself is in this category).
4. Pin the Node version to one that supports `--experimental-strip-types` (≥22.6) so POM scripts run unchanged.
5. Wire the pre-commit hook (`pom:init` installs one) and CI to the same `pom:lint` command, so local and remote behavior match.
6. If POM is added later to an existing pipeline, prefer extending an existing stage over creating a parallel POM job — fewer pipelines, fewer surprises.

## What this guide is not

This file is a starting point, not a normative requirement. POM does not need CI to function: skills, prompts, templates, and `pom:lint` run locally. Use this guide when the project wants the same checks enforced on every change, regardless of who runs them.

If the project does not adopt CI, state explicitly in `PROJECT_STATE.md` or in the project README that automated POM checks live in the local pre-commit hook only.
