# Component Contracts (PoC)

This directory carries **deferred contracts** for atomic-design molecules. Each contract has three companion files:

```
nav-item.md                       # Human-readable prose summary
nav-item.contract.json            # Machine-readable source of truth (verifier consumes this)
nav-item.probe.pass.json          # Sample probe that satisfies the contract
nav-item.probe.fail.json          # Sample probe with typical AI-generated drifts
```

A contract has six top-level blocks. All must be present:

| Block | What it captures | Why it closes the visual gap |
| --- | --- | --- |
| `identity` | level, name, summary | Disambiguates atom vs molecule vs organism. |
| `source` | how/when/where the values were measured | A contract with `source.status === "pending-crawl"` is *unverified* — its values are placeholders, not commitments. |
| `layout` | display, direction, align/justify, gap, height, padding, border | Asymmetric padding caught here is the optical-centering signal. |
| `typography` | family, size, weight, line-height, letter-spacing, font-feature-settings, whiteSpace | Letter-spacing and `tnum` are the two most common AI-generation tells. |
| `iconSlot` | size, position, baselineOffsetY | Optical alignment of icon vs label. |
| `hitbox` | minWidth, minHeight | Touch-target accessibility, decoupled from visual size. |
| `states` | default / hover / focus-visible / active / selected / disabled | Each state must declare token-mapped color, background, indicator geometry, and cursor. |
| `motion` | per-transition duration, easing, property + reducedMotion | Forces cubic-bezier values; "ease" alone is a violation. |
| `a11y` | role, current attribute, keyboard, forcedColors | Captures `aria-current="page"` for the selected nav item. |
| `composition` | parent, slot, child whitelist, forbiddenSiblings, responsive | Catches misuse like `<Emoji>` injected into the icon slot. |

## Pipeline

```
1a. Authenticated crawl (logged-in surfaces)
    synapse-design-md crawl --login                       # one-time, writes auth/storage-state.json
    synapse-design-md contract crawl \
      --url /workspace \
      --selector 'header nav a' \
      --selected-selector 'header nav a[aria-current="page"]' \
      --disabled-selector 'header nav a[aria-disabled="true"]' \
      --component nav-item
    → writes evidence/contracts/nav-item/<timestamp>.probe.json

1b. Public crawl (no login required)
    synapse-design-md contract crawl --public \
      --url /auth/login --selector 'button[type="submit"]' --component login-button

2.  Promote a probe to a contract (manual review of intent — anatomy, anti-patterns)
    → copy evidence/contracts/<name>/<latest>.probe.json
    → into examples/molecules/<name>.contract.json
    → flip source.status from "pending-crawl" to "captured"

3.  Verify a consumer build
    synapse-design-md contract verify \
      --contract examples/molecules/nav-item.contract.json \
      --probe   path/to/consumer.probe.json
    → exits 0 on pass, 1 on any violation
    → groups violations by axis: layout / optical / style / motion / a11y / composition
```

## Token reverse-mapping

The crawler captures raw `getComputedStyle` values and looks them up in a
reverse index built from `templates/DESIGN.md`. Each dimensional field also
declares its **preferred namespace** so that 8px-as-padding maps to
`spacing.sm` while 8px-as-radius maps to `rounded.lg`:

| Field | Preferred namespaces |
| --- | --- |
| layout.gap / padding* / border.width | `spacing.`, `sizes.` |
| layout.height / width | `sizes.`, `spacing.` |
| layout.border.radius | `rounded.` |
| typography.size | `typography.scale.`, `spacing.` |
| typography.lineHeight | `typography.scale.`, `spacing.` |
| typography.letterSpacing | `typography.scale.` |
| state.color / backgroundColor / outlineColor | `colors.` |

When no token matches the captured value, the probe emits the raw value with
no `token` field — the verifier then surfaces this as a token-coverage hole.
This is by design: untokened values in production are exactly the silent
drift the contracts exist to catch.

## Consumer hook (recommended wiring)

The verifier is a pure Node module — call it from any of:

- **Pre-commit / CI** — `synapse-design-md contract verify ...` in `package.json` scripts.
- **Editor / agent hook** — Claude Code `PostToolUse` (Edit/Write) re-runs verification on the touched contract and surfaces violations inline.
- **Golden screenshots** — pair the verifier with `golden/<component>/<state>.png` for pixel diff (out of scope for this PoC).

## Why JSON, why not Markdown only

Markdown is for humans; the verifier needs unambiguous keys and units. Each measurement is `{ value, unit, token? }`:

- `value`/`unit` lets the verifier check numeric equality and surface "8px ≠ 7px".
- `token` lets it enforce that the consumer reads `spacing.md`, not a raw `12px` — a contract update then propagates without code chasing.

A contract whose dimensional fields lack `token` references is a token-coverage hole and is reported as such.

## What the failing probe demonstrates

`nav-item.probe.fail.json` is hand-crafted to fail in the most common AI-generation ways:

- height bumped from 36 → 40
- symmetric vertical padding (8/8 instead of 7/9)
- weight 400 instead of 500
- letter-spacing 0 instead of -0.006em
- selected state has color change but no indicator bar
- focus-visible ring uses accent color (wrong token) at 1px width
- motion easing is `ease` instead of the design's cubic-bezier
- `aria-current` is missing
- composition lets `<Emoji>` into the icon slot
- hitbox is 24×24 (below WCAG target)

Run it yourself:

```
node ./bin/synapse-design-md.js contract verify \
  --contract examples/molecules/nav-item.contract.json \
  --probe   examples/molecules/nav-item.probe.fail.json
```
