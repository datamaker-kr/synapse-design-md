# synapse-design-md

Drop the Synapse design contract (`DESIGN.md`) into any repository so your team — and the AI agents that work in that repo — share one source of truth for color, typography, spacing, components, and accessibility.

Target environment: **macOS / Linux**. On Windows, use WSL.

## Install or update

From your repo root (where `.git/` lives), run the same one-liner whether you are installing for the first time or pulling in a newer release:

```bash
curl -fsSL https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/main/install.sh | bash
```

The script asks the GitHub API for the latest published release and installs from that tag, so you never have to think about version numbers. It writes three files to the repo root and nothing else:

| File | Purpose |
| --- | --- |
| `DESIGN.md` | Token contract + design prose. Humans read it directly; AI coders reference it. |
| `AGENTS.md` (managed block) | Tells Claude Code / Cursor / Codex to consult `DESIGN.md` whenever they generate UI. |
| `.synapse-design-md.json` | Version stamp + integrity hash. Used by re-runs to detect local edits safely. |

No CLI source, no evaluation tooling, no captured screenshots — only the three files above.

### Pinning to a specific version (optional)

If you want a deterministic, reproducible install (CI, release artifacts), pin to a tag:

```bash
SYNAPSE_DESIGN_MD_REF=v0.3.0 curl -fsSL \
  https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/main/install.sh | bash
```

Or fetch the install script that was shipped with a specific tag:

```bash
curl -fsSL https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/v0.3.0/install.sh | bash
```

## Day-to-day

**You** read `DESIGN.md` like any spec — every token (`colors.accent`, `typography.body-md`, `components.button-primary`, …) and the rules around it live in one file.

**Your AI coder** picks `DESIGN.md` up automatically because the install added a managed block to `AGENTS.md`. From then on prompts like *"add a status pill"* resolve to `components.status-pill-success` rather than inventing a one-off color. No prompt engineering required.

Patterns that work well:

- Reference components by token name: *"render a `card-default` with a `table-header-cell` row and three `table-row` items."*
- For non-obvious decisions, point at the relevant DESIGN.md section: *"follow the **Known Accessibility Risks** carve-out for status pills."*
- If the agent invents an off-token value, ask it to re-resolve against `DESIGN.md` — a fitting token usually already exists.

## Re-running is safe

The same install command also acts as an updater:

- `DESIGN.md` is overwritten only when its hash still matches what the script previously installed.
- If you have local edits, the new version is written next to it as `DESIGN.md.synapse-vX.Y.Z.new`. Diff before adopting.
- The `AGENTS.md` managed block (between `<!-- synapse-design-md:start -->` and `<!-- synapse-design-md:end -->`) is replaced in place; anything outside the block is preserved.
- To overwrite local edits intentionally after review:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/datamaker-kr/synapse-design-md/main/install.sh \
    | bash -s -- --force
  ```

## Troubleshoot

- **"run this from a git repository root"** — the current directory has no `.git/`. `cd` to the repo root and rerun.
- **`DESIGN.md.synapse-vX.Y.Z.new` appeared** — your `DESIGN.md` has local edits and the script refused to overwrite. Diff the two files, merge what you want, then either delete the `.new` file or rerun with `--force`.
- **AI agent ignoring the contract** — verify the managed block still exists in `AGENTS.md`. Rerun the install command if it does not.
- **GitHub API unreachable** — the script falls back to the version bundled with `install.sh`. If you need a specific release behind a restrictive network, set `SYNAPSE_DESIGN_MD_REF=vX.Y.Z` and fetch from the matching tag directly.

## Auxiliary tools (optional)

The curl one-liner is enough for most users. The CLI under `bin/` (Node 18+) adds maintainer-flavored commands; clone the repo and run them if you want any of these:

```bash
node ./bin/synapse-design-md.js check    # validate the installed DESIGN.md
node ./bin/synapse-design-md.js diff     # preview what the next install would change
node ./bin/synapse-design-md.js doctor   # report install state + version
node ./bin/synapse-design-md.js preview  # render every token as a single-file HTML catalog
```

Run `--help` for the full command list.

## Maintainers

If you maintain this package — sync, governance, authenticated crawl, CI gates, evaluation rubric — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
