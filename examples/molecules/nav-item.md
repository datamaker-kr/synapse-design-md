# Nav Item Molecule

A single navigation link inside the primary app-shell header nav group. The active/selected variant tells users where they are in the product and must be visually distinct without relying on color alone.

Anatomy: `icon? + label + indicator?` arranged as `inline-flex / row / align:center`.

States (each requires a distinct visual treatment):

- **default** — muted label, transparent surface, no indicator.
- **hover** — primary label, `surface.hover` background.
- **focus-visible** — composes with every state; 2px `ring.focus` outline, 2px offset.
- **active (pressed)** — `surface.pressed` background while pointer/key is held.
- **selected** — represents `aria-current="page"`; `surface.selected` background **and** a 2px leading-edge `accent.primary` bar indicator. Color change alone is not sufficient.
- **disabled** — disabled label, `cursor: not-allowed`, no indicator, no hover/active reaction.

Rules:

- Encode the selected state with both color **and** geometry (the indicator bar). Color-only fails for color-blind users.
- Do not animate `opacity` without honoring `prefers-reduced-motion: reduce`.
- Vertical padding is intentionally asymmetric (`7px / 9px`) to optically center the label baseline. Do not "fix" it to be symmetric.
- The icon slot baseline is offset by `-1px` for the same reason.
- Touch target minimum is `32 × 36` on desktop, `44 × 44` on mobile.

## Source of truth

The machine-readable contract is [`nav-item.contract.json`](./nav-item.contract.json). The prose above is a human-friendly rendering of that file — do not edit the rules here without updating the contract.

The contract is enforced by `scripts/verify-contract.mjs`. See [`README.contract.md`](./README.contract.md) for the full pipeline.
