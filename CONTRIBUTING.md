# Contributing to synapse-design-md

This document is for people **maintaining the package**, not for consumers installing it. If you only want to use the contract in your own repo, the README is enough.

## Repository layout

- `templates/DESIGN.md` — the source of truth for what `install` writes. Hand-edited blocks live here.
- `scripts/semantic-aliases.json` — programmatic source for the `sizes` block (and only that block, see governance below).
- `scripts/*.mjs` — CLI implementations (install, sync, check, crawl, eval, preview, verify-colors, contrast, test, etc.).
- `bin/synapse-design-md.js` — CLI entry point.
- `eval/` — evaluation rubric + thresholds (the bar for a passing design review).
- `fixtures/` — small anonymized inputs used by tests.
- `golden/` — curated reference screenshots / outputs. Commit only after deliberate review.
- `.github/workflows/check.yml` — CI gate (runs on the self-hosted `runner-set`).

## Governance: who owns which block (Issue #3, option C)

`DESIGN.md` frontmatter is governed in two ways:

| Block | Owner | How to edit |
| --- | --- | --- |
| `spacing:` | `sync` | values are hardcoded in `scripts/sync-from-source.mjs` |
| `sizes:` | `sync` | edit `scripts/semantic-aliases.json` and run `sync --write` |
| `colors:` | hand-edit | edit `templates/DESIGN.md` directly |
| `typography:` | hand-edit | edit `templates/DESIGN.md` directly |
| `rounded:` | hand-edit | edit `templates/DESIGN.md` directly |
| `components:` | hand-edit | edit `templates/DESIGN.md` directly |
| markdown body | hand-edit | edit `templates/DESIGN.md` directly |

`sync` does **surgical YAML block replacement** — it only rewrites the `spacing:` and `sizes:` blocks and leaves every other block untouched. State variants, semantic-subtle pairs, focus ring, mono typography, and the entire `components:` map survive `sync --write` + `install --force`.

A guard in `scripts/sync-from-source.mjs` refuses to run if `components` reappears in `semantic-aliases.json` — that single check is what prevents the silent regression Issue #3 was filed for. Re-extending `sync` to own `colors`/`typography`/`rounded` is the long-term option A and requires a deliberate schema expansion before it can land.

## Syncing tokens from source

```bash
# Dry run — prints the would-be templates/DESIGN.md
node bin/synapse-design-md.js sync --source ../synapse-workspace

# Apply (only spacing + sizes blocks change)
node bin/synapse-design-md.js sync --source ../synapse-workspace --write

# Refresh the repo-root DESIGN.md from the updated template
node bin/synapse-design-md.js install --force
```

The source path can also come from `--source <path>` or `SYNAPSE_SOURCE`. Sync still requires the four upstream theme files on disk as a link check; it does not read their content.

## Authenticated crawl (M3)

`crawl` drives Playwright (Chromium) against the live product to produce rendered evidence — the channel layer 4 of the evaluation model expects.

```bash
export EVAL_FIXTURE_STANDARD_EMAIL=...
export EVAL_FIXTURE_STANDARD_PASSWORD=...

node bin/synapse-design-md.js crawl --login                  # save storage state
node bin/synapse-design-md.js crawl                          # crawl every parameterless non-auth route
node bin/synapse-design-md.js crawl --category dashboard     # one category at a time
node bin/synapse-design-md.js crawl --limit 5                # cap for smoke
node bin/synapse-design-md.js crawl --headed                 # visible browser
node bin/synapse-design-md.js crawl --base-url https://...   # alternate environment
```

Each run lands under `evidence/crawl-runs/<ISO-timestamp>/`:

- `manifest.json` — per-page status, HTTP code, redirect path, page title, console error count, viewport, and a computed-style sample of `body` / first heading / first button.
- `screenshots/<route-slug>.png` — viewport screenshot.
- `logs/<route-slug>.console.log` — console-error capture for routes that produced errors.

`evidence/crawl-runs/`, `auth/`, and any `storage-state.json` are gitignored. Only curated, anonymized outputs should be promoted to `golden/` or `fixtures/`.

## Evaluation model

Validation is layered:

1. `@google/design.md` lint for format and token shape.
2. Static code scan (`synapse-design-md eval --target <file-or-dir>`) for raw colors, arbitrary font sizes, arbitrary spacing/radius, redundant arbitrary values.
3. Rendered page evaluation against `eval/rubric.md` (8 categories, weighted to 100) and `eval/thresholds.json` (overall ≥ 85 to pass; accessibility ≥ 90).
4. Authenticated crawl evidence for layer-4 rendered checks.

Categories: color, typography, spacing, components, interaction states, responsive, accessibility, product tone. Accessibility is the strictest threshold and requires a real contrast tool — visual inspection is not accepted.

## Continuous integration (M6)

`.github/workflows/check.yml` runs on every PR and push to `main` on the self-hosted `runner-set`. The job is intentionally narrow so it can gate every change:

1. `npm ci`
2. `npm test` — node:test suite covering the contracts the project has silently regressed against before:
   - `semantic-aliases.json` has no `components` key (Issue #3 governance).
   - `semantic-aliases.json#sizes` is a non-empty string map.
   - `templates/DESIGN.md` frontmatter contains every required block.
   - `sync` dry-run is byte-identical to the committed template (uses `fixtures/ci-source/`, no synapse-workspace checkout needed).
   - `DESIGN.md` has no leftover `__PACKAGE_VERSION__` placeholder.
3. `synapse-design-md check --strict` — Google `@google/design.md` lint plus structural checks on DESIGN.md / AGENTS.md / install manifest.

The crawl is deliberately not in CI — live credentials and a Chromium download do not belong in a per-PR gate.

## Verification scripts

| Script | What it checks |
| --- | --- |
| `npm test` | governance, sync round-trip, frontmatter structure, install hygiene |
| `npm run verify:colors` | each color slot is palette-backed, source-grep-backed, or named as bespoke |
| `node scripts/contrast.mjs` | recomputes the contrast matrix in DESIGN.md from token hex values |

## Page inventory

```bash
node bin/synapse-design-md.js inventory --source ../synapse-workspace          # dry run
node bin/synapse-design-md.js inventory --source ../synapse-workspace --write  # persist
```

`scripts/synapse-pages.json` is the categorized inventory the crawl reads. Categories: `auth-public`, `index`, `detail`, `settings`, `form`, `dashboard`, `workspace`. `:param` slots can be filled from a local lookup table (gitignored) to produce concrete URLs.

## Repository data policy

Commit:

- design contract source (`templates/`, `scripts/semantic-aliases.json`)
- CLI source (`bin/`, `scripts/`)
- evaluation rubric + thresholds (`eval/`)
- small anonymized fixtures (`fixtures/anonymized/`, `fixtures/ci-source/`)
- curated golden screenshots (`golden/`)
- examples (`examples/`)

Do **not** commit:

- cookies, storage state, local auth files (`auth/`, `*.storage-state.json` — gitignored)
- raw authenticated screenshots, customer data dumps (`evidence/crawl-runs/` — gitignored)
- secrets of any kind

## Releasing

1. Bump `package.json#version`.
2. `node bin/synapse-design-md.js install --force` to refresh `DESIGN.md` and `.synapse-design-md.json` with the new version stamp.
3. `npm test && node bin/synapse-design-md.js check --strict`.
4. Tag and push; the GitHub release tag is what consumers pin via `npx github:datamaker-kr/synapse-design-md#vX.Y.Z install`.
