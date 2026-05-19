# synapse-design-md

Synapse `DESIGN.md` contract installer, updater, and evaluator.

This repository owns the design system source, CLI tools, templates, examples, evaluation rubric, and curated reference evidence. Consumer repositories should receive only the minimal install footprint.

## Install Footprint

`synapse-design-md install` writes these files to the current git repository root:

- `DESIGN.md`
- `AGENTS.md` managed marker block
- `.synapse-design-md.json`

It does not copy evaluator source, examples, raw crawl output, cookies, storage state, or authenticated screenshots into consumer repositories.

## Usage

From a consumer repository root:

```bash
npx github:<org>/synapse-design-md#v0.1.0 install
```

After npm publishing:

```bash
npx synapse-design-md install
```

Local development:

```bash
node ./bin/synapse-design-md.js doctor
node ./bin/synapse-design-md.js examples list
```

## Commands

```bash
synapse-design-md install [--force]
synapse-design-md update [--force]
synapse-design-md check [--strict]
synapse-design-md diff
synapse-design-md doctor
synapse-design-md eval --target <url-or-file>
synapse-design-md crawl --login
synapse-design-md crawl [--base-url <url>] [--category <name>] [--limit <n>] [--headed] [--out <dir>]
synapse-design-md sync [--source <path>] [--write]
synapse-design-md inventory [--source <path>] [--write]
synapse-design-md preview [--out preview.html]
synapse-design-md examples list
synapse-design-md examples show pages/dashboard
```

## Syncing Tokens From Source

`DESIGN.md` is split into two governance domains (Issue #3, option C):

| Block | Owner | Edit how |
| --- | --- | --- |
| `spacing:` | `sync` | edit values in `scripts/sync-from-source.mjs` (hardcoded today) |
| `sizes:` | `sync` | edit `scripts/semantic-aliases.json` and re-run `sync --write` |
| `colors:` | hand-edit | edit `templates/DESIGN.md` directly |
| `typography:` | hand-edit | edit `templates/DESIGN.md` directly |
| `rounded:` | hand-edit | edit `templates/DESIGN.md` directly |
| `components:` | hand-edit | edit `templates/DESIGN.md` directly |
| Markdown body | hand-edit | edit `templates/DESIGN.md` directly |

`sync` does surgical YAML block replacement: it only rewrites the `spacing:`
and `sizes:` blocks inside the existing frontmatter and leaves every other
block untouched. Hand-edited tokens (state variants, semantic-subtle pairs,
focus ring, mono typography, etc.) survive `sync --write` and
`install --force`. Re-extending sync to own `colors`/`typography`/`rounded`
is the long-term option A and requires a deliberate schema expansion in
`semantic-aliases.json` first.

```bash
# 1. Dry-run sync (prints the would-be templates/DESIGN.md to stdout)
node bin/synapse-design-md.js sync --source ../synapse-workspace

# 2. Apply sync to templates/DESIGN.md (only spacing + sizes blocks change)
node bin/synapse-design-md.js sync --source ../synapse-workspace --write

# 3. Refresh DESIGN.md at the repo root from the updated template
node bin/synapse-design-md.js install --force

# 4. Verify nothing regressed
node bin/synapse-design-md.js check
```

The source path can be supplied via `--source <path>` or the `SYNAPSE_SOURCE`
environment variable (drop it in a gitignored `.env` to avoid retyping). The
upstream `synapse-workspace/lib/tailwind/theme/*.js` files are still required
on disk (sync uses their presence as a link check) even though no values are
read from them today.

To retune the `sizes` contract:

1. Edit `scripts/semantic-aliases.json` (`sizes` block only — sync refuses to
   run if a `components` key reappears).
2. Re-run `sync --write` and `install --force`.
3. Commit the regenerated `templates/DESIGN.md` and `DESIGN.md`.

The sync command never touches the markdown body — prose under
`## Overview`, `## Colors`, etc. is hand-authored and preserved across runs.

## Page Inventory

`scripts/synapse-pages.json` is a categorized inventory of every route in
`synapse-workspace/pages`, regenerated from the file tree. Categories:

- `auth-public` — `definePageMeta({ skipAuth: true })`, `/auth/*`, `/token-login`, `/request-permission`
- `index` — list views without `:param` (e.g. `/projects`, `/catalog/collections`)
- `detail` — routes ending in `:id` (e.g. `/projects/:project_id`)
- `settings` — `/settings/*`, `/account/*`, `*/settings/*`
- `form` — `*/create*`, `*/modify`, `*/learning-create`
- `dashboard` — `*/statistics/*`
- `workspace` — sub-views inside an entity context

Each entry also captures the source file path, route `params`, the `layout`
(from `definePageMeta`), and whether the page is `.client.vue`-only.

```bash
# Preview the inventory without writing
node bin/synapse-design-md.js inventory --source ../synapse-workspace

# Persist to scripts/synapse-pages.json
node bin/synapse-design-md.js inventory --source ../synapse-workspace --write
```

The inventory feeds future crawl tooling — `:param` slots can be filled
from a local lookup table (gitignored) to produce concrete URLs.

## Preview

`synapse-design-md preview` reads the YAML frontmatter from `DESIGN.md` in the current directory, resolves token references, and writes a single-file HTML catalog of every color, type scale, spacing/radius/shadow step, and component (with `-hover` / `-focused` / `-pressed` / `-disabled` / `-selected` / `-active` state variants rendered as static instances).

Use it as a visual sanity check after editing tokens and as the anchor for golden-screenshot regression in `golden/`. The current contract is light-only; `preview-dark.html` ships once dark-mode tokens land in `DESIGN.md` (tracked in Known Gaps).

## Update Policy

Updates are non-destructive by default.

- `DESIGN.md` is replaced only when it matches the previously installed managed hash.
- If `DESIGN.md` has local changes, the updater writes `DESIGN.md.synapse-vX.Y.Z.new`.
- `AGENTS.md` is never append-only. The CLI replaces only the managed marker block.
- `--force` allows managed replacement after manual review.

Managed block:

```md
<!-- synapse-design-md:start version=0.1.0 -->
...
<!-- synapse-design-md:end -->
```

## Evaluation Model

Validation has three layers:

1. `@google/design.md` lint for format and token checks.
2. Static code validation for raw colors, arbitrary font sizes, arbitrary spacing/radius, and local component clones.
3. `synapse-design-md eval --target <file-or-dir>` for an initial static drift scan.
4. Rendered page evaluation using desktop/mobile screenshots, accessibility evidence, and the rubric in `eval/rubric.md`.

## Authenticated Crawl

`synapse-design-md crawl` drives Playwright (Chromium) against the live
Synapse product to produce the rendered-evidence channel that layer 4 of the
evaluation model expects. Credentials come from the environment, never the
repo:

```bash
export EVAL_FIXTURE_STANDARD_EMAIL=…
export EVAL_FIXTURE_STANDARD_PASSWORD=…

# 1. Log in once and persist storage state to auth/storage-state.json (gitignored)
synapse-design-md crawl --login

# 2. Crawl every parameterless non-auth route from scripts/synapse-pages.json
synapse-design-md crawl                       # default base: https://test.synapse.sh
synapse-design-md crawl --category dashboard  # one category at a time
synapse-design-md crawl --limit 5             # cap routes for smoke runs
synapse-design-md crawl --headed              # run with a visible browser window
synapse-design-md crawl --base-url https://staging.example.com
```

Each run writes `evidence/crawl-runs/<ISO-timestamp>/` containing:

- `manifest.json` — per-page status, HTTP code, redirect path, page title,
  console error count, viewport, and a computed-style sample (`body`,
  first heading, first button — used to compare actual rendered values
  against the DESIGN.md token contract).
- `screenshots/<route-slug>.png` — viewport screenshot (1440×900).
- `logs/<route-slug>.console.log` — console-error capture for any route
  that produced errors.

Routes with `:param` slots and the `auth-public` category are skipped by
default. The whole `evidence/crawl-runs/` tree, `auth/`, and any
`storage-state.json` are gitignored — only curated, anonymized output
should be promoted into `golden/` or `fixtures/`.

## Continuous Integration

`.github/workflows/check.yml` runs on every pull request and on push to
`main`. The job is intentionally narrow — fast enough to gate every change:

1. `npm ci` — installs the (dev-only) Playwright + design-md dependencies.
2. `npm test` — node:test suite covering the contracts that the project
   silently regressed against in the past:
   - `semantic-aliases.json` has no `components` key (Issue #3 governance).
   - `semantic-aliases.json#sizes` is a non-empty string map.
   - `templates/DESIGN.md` frontmatter still contains every required block
     (`colors`, `typography`, `spacing`, `rounded`, `sizes`, `components`).
   - `sync` dry-run is byte-identical to the committed `templates/DESIGN.md`
     (runs against a stub theme fixture under `fixtures/ci-source/` so the
     test does not need the synapse-workspace checkout).
   - `DESIGN.md` has no leftover `__PACKAGE_VERSION__` placeholder.
3. `synapse-design-md check --strict` — Google `@google/design.md` lint plus
   the structural checks on `DESIGN.md`, `AGENTS.md`, and the install
   manifest. Strict mode fails the build if the lint cannot run.

The crawl (M3) is intentionally not part of CI — it requires live
credentials and a Chromium download, neither of which belong in a per-PR
gate.

## Repository Data Policy

Commit:

- design contract source
- CLI source
- templates
- rubric and thresholds
- examples
- small anonymized fixtures
- curated golden screenshots

Do not commit:

- cookies
- storage state
- local auth files
- raw authenticated screenshots
- customer data dumps
- crawl run output
