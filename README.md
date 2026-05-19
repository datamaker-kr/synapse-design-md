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
synapse-design-md crawl --out evidence/crawl-runs
synapse-design-md examples list
synapse-design-md examples show pages/dashboard
```

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
