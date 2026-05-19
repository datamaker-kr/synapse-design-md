# synapse-design-md

Drop the Synapse design contract into any repository so your team — and the AI agents that work in that repo — share a single source of truth for color, typography, spacing, components, and accessibility.

## What lands in your repo

Three files at the repo root, nothing else:

| File | Purpose |
| --- | --- |
| `DESIGN.md` | The full token contract + design prose. Read it directly, or point your AI coder at it. |
| `AGENTS.md` (managed block) | Instructs Claude Code / Cursor / Codex to reference `DESIGN.md` whenever they generate UI. |
| `.synapse-design-md.json` | Version stamp + integrity hash. Lets `update` know whether your `DESIGN.md` is still managed or has been hand-edited. |

Nothing else is copied — no CLI source, no examples, no evaluation tooling, no captured screenshots.

## Install

From the repository where you want the contract:

```bash
# After publishing to npm
npx synapse-design-md install

# Or from a tagged GitHub release
npx github:datamaker-kr/synapse-design-md#v0.1.0 install
```

The command refuses to write outside a git root. Run it once; commit the three files; you're done.

## Day-to-day

**You** read `DESIGN.md` like any spec — it documents every token (e.g. `colors.accent`, `typography.body-md`, `components.button-primary`) and the rules that go with them.

**Your AI coder** picks `DESIGN.md` up automatically because the install added a managed block to `AGENTS.md`. From then on, prompts like *"add a status pill"* will resolve to `components.status-pill-success` instead of inventing a one-off color. No extra prompt engineering needed.

A few patterns to lean on:

- Reference components by token name in your prompts: *"render a `card-default` containing a `table-header-cell` row and three `table-row` items."*
- When a design decision is non-obvious, point at the matching section of `DESIGN.md`: *"follow the **Known Accessibility Risks** carve-out for status pills."*
- If the agent invents an off-token value, ask it to re-resolve against `DESIGN.md` — the contract usually has a token that fits.

## Update

```bash
npx synapse-design-md update          # safe, non-destructive
npx synapse-design-md update --force  # replace your DESIGN.md after manual review
```

The updater is conservative:

- `DESIGN.md` is replaced only when its hash still matches what was installed. If you have local edits, the new version is written next to it as `DESIGN.md.synapse-vX.Y.Z.new` so you can diff before overwriting.
- The `AGENTS.md` managed block (between `<!-- synapse-design-md:start -->` and `<!-- synapse-design-md:end -->`) is replaced in place. Hand-edits outside the block are preserved.
- `--force` skips the hash check after you have reviewed the incoming changes.

## Preview

```bash
npx synapse-design-md preview --out preview.html
```

Writes a single-file HTML catalog of every color, type scale, spacing/radius step, and component (including hover / focused / pressed / disabled / selected state variants). Useful as a visual sanity check after pulling a new version, and as the anchor for golden-screenshot regression.

## Commands you actually use

```bash
synapse-design-md install [--force]    # initial install
synapse-design-md update  [--force]    # pull a new contract version
synapse-design-md check   [--strict]   # lint the installed DESIGN.md
synapse-design-md diff                 # what the next update would change
synapse-design-md doctor               # report install state + version
synapse-design-md preview [--out file] # HTML token catalog
```

If you ever want to see everything the CLI can do, `synapse-design-md --help`.

## Troubleshoot

- **`install` refuses to run** — make sure you're at a git repo root. The CLI will not write outside one.
- **`update` wrote a `.synapse-vX.Y.Z.new` file** — your `DESIGN.md` has local edits. Diff the two, merge what you want, then either delete the new file or run `update --force`.
- **`check` fails on Google design.md lint** — your `DESIGN.md` was hand-edited away from the schema. Run `diff` to see what differs from the installed template; `update --force` reverts to a clean copy.
- **AI agent ignores the contract** — confirm `AGENTS.md` still contains the managed block (`<!-- synapse-design-md:start ... -->`). Re-run `update` if it's gone.

## Contributing & internals

If you maintain this package — sync, governance split, authenticated crawl, CI gates, evaluation rubric — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).
