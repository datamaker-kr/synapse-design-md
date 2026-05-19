---
version: beta
name: Synapse
description: |
  Operational product canvas for Synapse — a dense, calm working surface
  optimized for prolonged professional use. Built on near-white surfaces
  with one-step subtle elevation, hairline borders for hierarchy instead
  of shadow, and a restrained blue accent reserved for primary actions,
  active navigation, and selected states. Type runs Pretendard Variable
  at compact sizes (11–30px) optimized for tables and dense forms, with
  a monospace family for IDs and tabular numbers. Shadow is reserved
  exclusively for transient overlays (modal, popover, dropdown, drawer);
  cards, panels, and tables separate through borders and tonal shifts.
  Border radius stays at or below 8px on containers, with pill radius
  limited to status pills and filter chips. Every interactive component
  ships hover, focused, and disabled state tokens so generated code
  references the system rather than ad-hoc CSS. Color and typography
  values are synced from synapse-workspace/lib/tailwind/theme via
  `synapse-design-md sync`.
x-synapse-design-md:
  packageVersion: 0.1.0
  source: synapse-design-md
  syncedFrom: synapse-workspace/lib/tailwind/theme

colors:
  accent: "#2461E9"
  accent-hover: "#1E44BC"
  accent-pressed: "#1B3174"
  accent-focus-ring: "#93B3F0"
  on-accent: "#FFFFFF"

  surface: "#FFFFFF"
  surface-subtle: "#FBFCFD"
  surface-elevated: "#FFFFFF"

  ink: "#182134"
  ink-muted: "#7B8AA0"
  ink-subtle: "#9DA9BD"

  hairline: "#D6DEE8"
  hairline-strong: "#BFCAD9"

  success: "#009D53"
  success-subtle: "#E6F7EE"
  warning: "#BB7C05"
  warning-subtle: "#FDF6E3"
  danger: "#D02323"
  danger-subtle: "#FCEBEB"
  info: "#2461E9"
  info-subtle: "#E6EEFE"

  selected-bg: "#E6EEFE"
  hover-bg: "#F4F7FB"
  disabled-bg: "#F0F3F8"
  disabled-fg: "#9DA9BD"

typography:
  fontFamily:
    sans: "\"Pretendard Variable\", ui-sans-serif, system-ui, sans-serif"
    mono: "ui-monospace, SF Mono, Menlo, monospace"
  scale:
    display-lg:  { fontFamily: sans, fontSize: 36px, fontWeight: 700, lineHeight: 40px, letterSpacing: "-0.022em" }
    headline-lg: { fontFamily: sans, fontSize: 30px, fontWeight: 650, lineHeight: 36px, letterSpacing: "-0.02em" }
    headline-md: { fontFamily: sans, fontSize: 24px, fontWeight: 650, lineHeight: 32px, letterSpacing: "-0.019em" }
    title-sm:    { fontFamily: sans, fontSize: 16px, fontWeight: 600, lineHeight: 24px, letterSpacing: "-0.011em" }
    body-md:     { fontFamily: sans, fontSize: 14px, fontWeight: 400, lineHeight: 20px, letterSpacing: "-0.006em" }
    body-sm:     { fontFamily: sans, fontSize: 13px, fontWeight: 400, lineHeight: 18px, letterSpacing: "-0.005em" }
    label-sm:    { fontFamily: sans, fontSize: 12px, fontWeight: 600, lineHeight: 16px, letterSpacing: "0em" }
    eyebrow:     { fontFamily: sans, fontSize: 11px, fontWeight: 600, lineHeight: 14px, letterSpacing: "0.4px", textTransform: uppercase }
    button:      { fontFamily: sans, fontSize: 13px, fontWeight: 600, lineHeight: 16px, letterSpacing: "0em" }
    mono:        { fontFamily: mono, fontSize: 13px, fontWeight: 400, lineHeight: 18px, letterSpacing: "0em" }

spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"

rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  pill: "9999px"

sizes:
  actionMin: 6.125rem
  controlHeight: 32px
  modalBody: 45rem
  modalHeight: 40rem
  modalMaxHeight: 50rem
  dialogWide: 37.5rem
  formColumn: 13.75rem
  pageColumn: 21.375rem
  guideOffset: 7.5rem
  wideCanvas: 80rem
  contentMax: 56rem

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    borderColor: transparent
    typography: button
    rounded: lg
    padding: "6px 16px"
    height: "32px"
  button-primary-hover:    { backgroundColor: "{colors.accent-hover}" }
  button-primary-pressed:  { backgroundColor: "{colors.accent-pressed}" }
  button-primary-focused:  { boxShadow: "0 0 0 2px {colors.accent-focus-ring}" }
  button-primary-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}" }

  button-tint:
    backgroundColor: "{colors.info-subtle}"
    textColor: "{colors.accent}"
    borderColor: transparent
    typography: button
    rounded: lg
    padding: "6px 16px"
    height: "32px"
  button-tint-hover:    { backgroundColor: "{colors.selected-bg}" }
  button-tint-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}" }

  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: button
    rounded: md
    padding: "0 {spacing.md}"
    height: "32px"
  button-secondary-hover:    { backgroundColor: "{colors.hover-bg}", borderColor: "{colors.hairline-strong}" }
  button-secondary-focused:  { boxShadow: "0 0 0 2px {colors.accent-focus-ring}", borderColor: "{colors.accent}" }
  button-secondary-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}", borderColor: "{colors.hairline}" }

  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: transparent
    typography: button
    rounded: md
    padding: "0 {spacing.sm}"
    height: "32px"
  button-ghost-hover:    { backgroundColor: "{colors.hover-bg}" }
  button-ghost-disabled: { textColor: "{colors.disabled-fg}" }

  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    borderColor: transparent
    typography: button
    rounded: md
    padding: "0 {spacing.md}"
    height: "32px"
  button-danger-hover: { backgroundColor: "#B91C1C" }

  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: body-md
    rounded: md
    padding: "{spacing.sm} {spacing.md}"
    height: "32px"
  input-hover:    { borderColor: "{colors.hairline-strong}" }
  input-focused:  { borderColor: "{colors.accent}", boxShadow: "0 0 0 2px {colors.accent-focus-ring}" }
  input-error:    { borderColor: "{colors.danger}" }
  input-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}" }

  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: body-md
    rounded: md
    padding: "{spacing.sm} {spacing.md}"
    height: "32px"
  select-focused:  { borderColor: "{colors.accent}", boxShadow: "0 0 0 2px {colors.accent-focus-ring}" }
  select-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}" }

  checkbox:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.hairline-strong}"
    rounded: xs
  checkbox-checked:  { backgroundColor: "{colors.accent}", borderColor: "{colors.accent}" }
  checkbox-disabled: { backgroundColor: "{colors.disabled-bg}", borderColor: "{colors.hairline}" }

  badge:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-muted}"
    rounded: md
    padding: "2px {spacing.sm}"
    typography: label-sm
  alert:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-muted}"
    borderColor: "{colors.hairline}"
    rounded: md
    padding: "{spacing.md} 48px"
    typography: body-sm

  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: body-sm
    padding: "{spacing.sm} {spacing.md}"
    height: "64px"
  table-row-hover:    { backgroundColor: "{colors.hover-bg}" }
  table-row-selected: { backgroundColor: "{colors.selected-bg}" }
  table-row-error:    { backgroundColor: "{colors.danger-subtle}" }
  table-row-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}" }
  table-header-row:
    backgroundColor: "{colors.surface-subtle}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.ink-muted}"
    typography: label-sm
    height: "40px"
  table-header-cell:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-muted}"
    borderColor: "{colors.hairline}"
    typography: eyebrow
    padding: "{spacing.sm} {spacing.md}"
  table-cell-numeric:
    typography: mono
    textAlign: right

  app-shell-nav:
    backgroundColor: "{colors.surface-subtle}"
    borderColor: "{colors.hairline}"
    padding: "{spacing.md}"
    width: "240px"
  nav-item:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: body-sm
    rounded: md
    padding: "{spacing.sm} {spacing.md}"
    height: "32px"
  nav-item-hover:  { backgroundColor: "{colors.hover-bg}", textColor: "{colors.ink}" }
  nav-item-active: { backgroundColor: "{colors.selected-bg}", textColor: "{colors.accent}" }

  breadcrumb:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: body-sm
    padding: "{spacing.sm} 0"
  breadcrumb-separator:
    backgroundColor: transparent
    textColor: "{colors.ink-subtle}"
    typography: body-sm

  tab:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    borderColor: transparent
    typography: body-sm
    padding: "{spacing.sm} {spacing.md}"
  tab-active:   { textColor: "{colors.ink}", borderColor: "{colors.accent}" }
  tab-disabled: { textColor: "{colors.disabled-fg}" }

  toolbar:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.hairline}"
    padding: "{spacing.sm} {spacing.md}"

  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: label-sm
    rounded: pill
    padding: "{spacing.xs} {spacing.md}"
  filter-chip-active:   { backgroundColor: "{colors.selected-bg}", textColor: "{colors.accent}", borderColor: "{colors.accent}" }
  filter-chip-disabled: { backgroundColor: "{colors.disabled-bg}", textColor: "{colors.disabled-fg}", borderColor: "{colors.hairline}" }

  status-pill-success: { backgroundColor: "{colors.success-subtle}", textColor: "{colors.success}", typography: label-sm, rounded: pill, padding: "{spacing.xs} {spacing.sm}" }
  status-pill-warning: { backgroundColor: "{colors.warning-subtle}", textColor: "{colors.warning}", typography: label-sm, rounded: pill, padding: "{spacing.xs} {spacing.sm}" }
  status-pill-danger:  { backgroundColor: "{colors.danger-subtle}",  textColor: "{colors.danger}",  typography: label-sm, rounded: pill, padding: "{spacing.xs} {spacing.sm}" }
  status-pill-info:    { backgroundColor: "{colors.info-subtle}",    textColor: "{colors.info}",    typography: label-sm, rounded: pill, padding: "{spacing.xs} {spacing.sm}" }
  status-pill-neutral: { backgroundColor: "{colors.surface-subtle}", textColor: "{colors.ink-muted}", borderColor: "{colors.hairline}", typography: label-sm, rounded: pill, padding: "{spacing.xs} {spacing.sm}" }

  badge-meta:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    typography: eyebrow

  card-default:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.hairline}"
    rounded: lg
    padding: "{spacing.lg}"
  detail-panel:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.hairline}"
    padding: "{spacing.lg}"
    width: "480px"
  empty-state:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-muted}"
    borderColor: "{colors.hairline}"
    typography: body-md
    rounded: lg
    padding: "{spacing.xxl}"
  error-banner:
    backgroundColor: "{colors.danger-subtle}"
    textColor: "{colors.danger}"
    borderColor: "{colors.danger}"
    typography: body-sm
    rounded: md
    padding: "{spacing.md}"

  toast-success: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", borderColor: "{colors.success}", typography: body-sm, rounded: md, padding: "{spacing.md}", boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)" }
  toast-warning: { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", borderColor: "{colors.warning}", typography: body-sm, rounded: md, padding: "{spacing.md}", boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)" }
  toast-danger:  { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", borderColor: "{colors.danger}",  typography: body-sm, rounded: md, padding: "{spacing.md}", boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)" }
  toast-info:    { backgroundColor: "{colors.surface}", textColor: "{colors.ink}", borderColor: "{colors.info}",    typography: body-sm, rounded: md, padding: "{spacing.md}", boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)" }

  dialog:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.hairline}"
    rounded: xl
    padding: "{spacing.xl}"
    boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)"
  modal-surface:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.hairline}"
    rounded: lg
    padding: "{spacing.xl}"
    boxShadow: "0 8px 24px rgba(17, 24, 39, 0.12)"
  popover-surface:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.hairline}"
    rounded: md
    padding: "{spacing.sm}"
    boxShadow: "0 2px 8px rgba(17, 24, 39, 0.08)"
  dropdown-surface:
    backgroundColor: "{colors.surface-elevated}"
    borderColor: "{colors.hairline}"
    rounded: md
    padding: "{spacing.xs}"
    boxShadow: "0 2px 8px rgba(17, 24, 39, 0.08)"
---

## Overview

Synapse is an operational SaaS dashboard. The surface is calm, dense, and built for repeated professional use across long working sessions. Tables, filters, detail panels, and toolbars are the dominant patterns; the visual system supports them by suppressing decoration and reserving emphasis (color, weight, contrast) for active state and meaningful data. This contract is the canonical entry point for AI-assisted UI work — every generated component must resolve its visual properties to a token defined in the YAML frontmatter above, never to an inline hex, ad-hoc px value, or raw CSS pseudo-state.

Tokens in the frontmatter are synced from `synapse-workspace/lib/tailwind/theme` via `synapse-design-md sync` — edit `scripts/semantic-aliases.json` and re-run the command to retune; do not hand-edit token values directly. The extended slots that are not part of the upstream tailwind theme (state variants, semantic-subtle pairs, focus ring, mono typography, sizes namespace) are maintained in this file.

> Source pages: (placeholder — populate after first authenticated crawl of the Synapse product surface)

## Colors

Color is grouped by role. Each role has a fixed token; do not mix groups when resolving a property.

**Brand & Action**
- **Accent** (`colors.accent`): primary actions, active nav, selected row indicator. The only chromatic emphasis in the system.
- **Accent Hover** (`colors.accent-hover`): hovered state of primary buttons and accent surfaces.
- **Accent Pressed** (`colors.accent-pressed`): the pressed/active step under accent.
- **Accent Focus Ring** (`colors.accent-focus-ring`): light-blue ring drawn around focused interactive elements via the focus-ring shadow.
- **On Accent** (`colors.on-accent`): text/icon color used on top of accent fills.

**Surface**
- **Surface** (`colors.surface`): default page and panel background.
- **Surface Subtle** (`colors.surface-subtle`): one-step elevation downward — used for table headers, side nav, empty states.
- **Surface Elevated** (`colors.surface-elevated`): the same value as Surface; elevation is communicated by hairline border and shadow, not tonal shift.

**Text**
- **Ink** (`colors.ink`): primary text, headings, table cell values.
- **Ink Muted** (`colors.ink-muted`): secondary text, table headers, captions, inactive nav items.
- **Ink Subtle** (`colors.ink-subtle`): tertiary text — placeholders, helper text, separators that need a label.

**Border**
- **Hairline** (`colors.hairline`): default 1px borders on cards, panels, tables, inputs.
- **Hairline Strong** (`colors.hairline-strong`): hover/raised border state for inputs and secondary buttons.

**Semantic**
- **Success** / **Success Subtle** — completed states, healthy indicators.
- **Warning** / **Warning Subtle** — degraded, attention-needed, throttled.
- **Danger** / **Danger Subtle** — failed, destructive confirmation, errored runs.
- **Info** / **Info Subtle** — neutral notice; deliberately equal to accent so info pills read as system messages.

Each semantic family has a strong foreground and a subtle background. Strong is used for icons, borders, and pill text; subtle is the pill fill. Do not introduce other shades.

**State**
- **Selected Bg** (`colors.selected-bg`): table row, nav item, filter chip in active state.
- **Hover Bg** (`colors.hover-bg`): hovered rows, ghost buttons, nav items.
- **Disabled Bg** / **Disabled Fg**: paired fill and label for disabled controls.

**Overlay**
- **Overlay Scrim** — `rgba(17, 24, 39, 0.4)` — backdrop for modal and drawer surfaces. Documented in prose because alpha colors are not part of the lint-enforced palette; use this literal CSS string at call sites.

**Provenance**
- **Palette-backed (14)** — `accent`, `accent-hover`, `accent-pressed`, `on-accent`, `surface`, `surface-subtle`, `surface-elevated`, `ink`, `ink-muted`, `hairline`, `success`, `warning`, `danger`, `info` — hex values are deterministic references into `synapse-workspace/lib/tailwind/theme/colors.js` (verifiable via `node scripts/verify-colors.mjs`).
- **Bespoke design-system extensions (11)** — `accent-focus-ring`, `ink-subtle`, `hairline-strong`, `success-subtle`, `warning-subtle`, `danger-subtle`, `info-subtle`, `selected-bg`, `hover-bg`, `disabled-bg`, `disabled-fg` — intentional non-palette values for states (focus, hover, disabled) and semantic-subtle pair backgrounds. They are not Tailwind palette pulls; treat them as canonical design tokens defined here, not as approximations of palette shades.

## Typography

**Font Family**
- Sans: `"Pretendard Variable", ui-sans-serif, system-ui, sans-serif` — all UI text.
- Mono: `ui-monospace, SF Mono, Menlo, monospace` — IDs, tokens, tabular numeric cells.

**Hierarchy**

| Token | Size | Weight | Line Height | Letter Spacing | Use |
| --- | --- | --- | --- | --- | --- |
| `display-lg` | 36px | 700 | 40px | -0.022em | Top-level index page hero title (projects, experiments, plugins) |
| `headline-lg` | 30px | 650 | 36px | -0.02em | Detail-page title, empty-state headings |
| `headline-md` | 24px | 650 | 32px | -0.019em | Section heading inside a page |
| `title-sm` | 16px | 600 | 24px | -0.011em | Card title, modal title, detail-panel header |
| `body-md` | 14px | 400 | 20px | -0.006em | Default body, form input value |
| `body-sm` | 13px | 400 | 18px | -0.005em | Table cell, dense form, breadcrumb, tab label |
| `label-sm` | 12px | 600 | 16px | 0em | Field labels, filter chip, status pill |
| `eyebrow` | 11px | 600 | 14px | 0.4px | Table header cell, badge-meta, section eyebrow (uppercase) |
| `button` | 13px | 600 | 16px | 0em | All button labels |
| `mono` | 13px | 400 | 18px | 0em | IDs, hashes, tabular numeric cells |

**Principles**
- Compact sizes are intentional: tables and forms are the work surface, and oversized type pushes useful data below the fold.
- Numeric columns must use `mono` so digit widths align.
- `eyebrow` is the only uppercase style; everything else uses sentence case.
- Sizes, line-heights, and letter-spacing values for the sans scale are synced from `synapse-workspace`. Do not override per-element; if a layout demands a missing step, propose a new token rather than a one-off value.

## Layout

**Spacing System**

`spacing.xs` 4px · `spacing.sm` 8px · `spacing.md` 12px · `spacing.lg` 16px · `spacing.xl` 24px · `spacing.xxl` 32px. All paddings, gaps, and margins resolve to these tokens. Negative space is part of the type system: smaller controls (chips, pills, table cells) use `xs`/`sm`; structural containers (cards, panels, modals) use `lg`/`xl`.

**Grid & Container**
- App shell: fixed `240px` left navigation (`app-shell-nav`), fluid content region with `max-width: 1440px` and `padding: spacing.xl` at `lg+` breakpoints.
- Detail panel docks at `480px` on the right edge of the content region; collapses to a modal below `md`.
- Forms and detail content use a two-column label/value grid at `lg+`, stacking below `md`.

**Whitespace Philosophy**
Dense by default. The operational user is scanning many rows in one viewport, not reading a marketing page. Padding inside tables is `spacing.sm` vertical / `spacing.md` horizontal so that 30+ rows fit a standard 1080p viewport without resizing.

## Elevation & Depth

Shadow is reserved for transient overlays only. Persistent surfaces (cards, panels, tables, toolbars) separate through borders and tonal shifts.

| Level | Treatment | Use |
| --- | --- | --- |
| 0 — Flat | No border, no shadow | Page background |
| 1 — Hairline | 1px `colors.hairline` border | Cards, panels, tables, inputs, toolbar |
| 2 — Tonal | `colors.surface-subtle` fill + hairline | Table headers, empty states, side nav |
| 3 — Overlay sm | `0 2px 8px rgba(17, 24, 39, 0.08)` + hairline | Popover, dropdown |
| 4 — Overlay md | `0 8px 24px rgba(17, 24, 39, 0.12)` + scrim | Modal, drawer, toast |
| 5 — Overlay lg | `0 16px 40px rgba(17, 24, 39, 0.16)` + scrim | Command palette, large dialog |
| Focus | `0 0 0 2px {colors.accent-focus-ring}` | Any keyboard-focused control |

Do not stack shadows on a persistent surface to imply hierarchy — use background, border, or spacing instead.

## Shapes

| Token | Value | Use |
| --- | --- | --- |
| `rounded.xs` | 2px | Checkbox, indicator dots inside pills |
| `rounded.sm` | 4px | Inline chips, small badges |
| `rounded.md` | 6px | Buttons, inputs, dropdowns, popovers, toasts, error banners |
| `rounded.lg` | 8px | Cards, modals, detail panels, empty states |
| `rounded.pill` | 9999px | Status pills, filter chips — only |

8px is the ceiling on container radius. Pill radius is reserved for compact informational tokens; never apply it to a primary action button, an input, or a card.

## Sizes

The `sizes` tokens cover recurring fixed widths and heights — modal bodies, action button minimums, control heights, and form/page columns. Reach for these before introducing a new `w-[…]`, `h-[…]`, or `min-w-[…]` arbitrary value. New entries should appear in at least four call sites before being promoted from arbitrary to semantic.

Avoid expressing Tailwind default scale values via arbitrary syntax (use `w-60` over `w-[15rem]`). Arbitrary syntax is reserved for genuine custom values that warrant a `sizes` token.

## Components

Every interactive component below defines hover, focused, and disabled state tokens. Tables and nav items add `selected`/`active` where appropriate.

**Buttons**
- **button-primary** — Accent fill, `on-accent` label. States: `-hover`, `-pressed`, `-focused`, `-disabled`.
- **button-secondary** — Surface fill, hairline border, ink label. States: `-hover`, `-focused`, `-disabled`.
- **button-ghost** — Transparent fill, ink label, no border; used inside toolbars and table rows. States: `-hover`, `-disabled`.
- **button-danger** — Danger fill, on-accent label; for destructive confirmation only. State: `-hover`.

**Inputs**
- **input** — Hairline border, body-md text. States: `-hover`, `-focused` (accent border + focus ring), `-error` (danger border), `-disabled`.
- **select** — Inherits input geometry; same focus and disabled handling.
- **checkbox** — `rounded.xs`, hairline-strong border. State: `-checked` (accent fill), `-disabled`.

**Tables & Lists**
- **table-row** — Default cell row with hairline bottom border. States: `-hover` (`hover-bg`), `-selected` (`selected-bg`).
- **table-header-cell** — `surface-subtle` fill, `eyebrow` text, uppercase, sticky.
- **table-cell-numeric** — Right-aligned, `mono` typography for column alignment.

**Navigation**
- **app-shell-nav** — Fixed 240px left rail on `surface-subtle`.
- **nav-item** — Default ghost row. States: `-hover`, `-active` (`selected-bg` + accent label).
- **breadcrumb** — body-sm in `ink-muted`, separator chevron uses `ink-subtle`.
- **tab** — Underline indicator via `borderColor` on `-active`. State: `-disabled`.
- **toolbar** — Surface fill, hairline bottom border, hosts filter chips and button-ghosts.

**Filters & Status**
- **filter-chip** — Pill radius, hairline border. States: `-active` (`selected-bg` + accent border), `-disabled`.
- **status-pill-{success,warning,danger,info,neutral}** — Subtle background + strong foreground from the matching semantic family. Neutral pill uses `surface-subtle` + `ink-muted` + hairline.
- **badge-meta** — Inline eyebrow label in `ink-muted` for metadata strips (timestamps, IDs paired with mono).

**Containers & Surfaces**
- **card-default** — Surface fill, hairline border, `rounded.lg`, `spacing.lg` padding. No shadow.
- **detail-panel** — Right-docked 480px panel; hairline left border, no shadow when docked, gains the overlay-md shadow when promoted to a modal at small breakpoints.
- **empty-state** — `surface-subtle` block with body-md `ink-muted` text and `spacing.xxl` padding.
- **error-banner** — `danger-subtle` fill, danger text and border.
- **toast-{success,warning,danger,info}** — Surface fill with a 2px left border in the matching semantic color and the overlay-md shadow.
- **modal-surface** / **popover-surface** / **dropdown-surface** — The only surfaces permitted to draw shadow.

## Do's and Don'ts

**Do**
- Reference state tokens (`-hover`, `-focused`, `-disabled`, `-selected`) instead of writing raw `:hover` / `:focus` CSS.
- Reserve accent color for primary action, active nav, selected row, and focus ring.
- Use `mono` typography for any identifier, hash, or numeric column where digit alignment matters.
- Use semantic-subtle backgrounds (status pills, banners, toasts) for non-blocking signaling.
- Respect the 32px minimum target on every interactive control; promote to 40px below `md`.
- Display a visible 2px focus-ring shadow in `accent-focus-ring` on every keyboard-focused control.

**Don't**
- Don't apply any shadow to cards, panels, tables, toolbars, or any persistent surface — borders carry hierarchy. Shadow is overlay-only.
- Don't use `rounded.pill` on standard buttons, inputs, or containers; reserve it for status pills and filter chips.
- Don't introduce decorative gradients, glow, spotlight, or atmospheric effects of any kind.
- Don't use accent for non-actionable decoration (icons in a card header, dividers, illustration tint).
- Don't generate marketing patterns (hero, pricing card, testimonial, CTA banner, customer logo strip) — Synapse has no such surfaces.
- Don't invent new spacing, type, or radius values outside the tokens; add a new token to this file first.

## Responsive Behavior

**Breakpoints**

| Name | Min Width |
| --- | --- |
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| xxl | 1536px |

**Touch Targets**
- **Min** (32px) — desktop-dense controls (table-row action buttons, toolbar ghosts).
- **Comfortable** (40px) — default control height on `md` and below.
- **Large** (44px) — primary action on mobile.

Breakpoints, touch-target sizes, and shadow box-shadow strings live in the markdown body rather than the YAML token map — they are convention, not enforced tokens, and remain compatible with the upstream `@google/design.md` lint schema (which scopes machine tokens to colors, typography, spacing, rounded, and components).

**Collapsing Strategy**
- `app-shell-nav` collapses from 240px rail to a top hamburger sheet below `lg`.
- Tables convert to a stacked card list below `md`: each row becomes a `card-default` with label/value pairs, primary action moved to a trailing `button-secondary`.
- `detail-panel` shifts from right dock to a full-height modal-surface below `md`.
- Toolbar filters collapse into a "Filters" `button-secondary` opening a popover below `md`.

**Image Behavior**
Product screenshots keep native aspect ratio (16:10 for app shots, 4:3 for cropped panels) and sit inside a `card-default`. Never letterbox with colored bars; use `surface-subtle` to fill remaining space if the aspect must be normalized.

## Accessibility

Synapse targets **WCAG 2.2 Level AA** on body text, primary actions, and focus indicators. AAA is preferred for headline and primary text but is not enforced. Accessibility, motion, and keyboard guidance live in the markdown body rather than the YAML token map — same convention as breakpoints and touch targets, and compatible with the `@google/design.md` lint schema (which scopes machine tokens to colors, typography, spacing, rounded, and components).

**Conformance Targets**
- Text and active controls: WCAG 2.2 AA (≥ 4.5:1 for body text < 18pt regular / < 14pt bold; ≥ 3:1 for large text).
- UI components and graphical objects: WCAG 1.4.11 Non-text Contrast ≥ 3:1 against the adjacent color when the component is the sole means of identifying state.
- Focus indicator: WCAG 2.4.11 Focus Appearance — visible, ≥ 2px thick, ≥ 3:1 against the adjacent color.
- Disabled controls are exempt from contrast minimums per WCAG 1.4.3 / 1.4.11.

**Contrast Matrix**

Ratios are computed against the documented hex values; recompute when token values change. See `scripts/contrast.mjs` (or any axe / pa11y / Lighthouse-a11y output) for evidence.

| Foreground | Background | Ratio | Level | Notes |
| --- | --- | ---: | --- | --- |
| `ink` | `surface` | 16.08 | AAA | Primary text |
| `ink` | `surface-subtle` | 15.65 | AAA | Primary text on subtle |
| `ink` | `hover-bg` | 14.97 | AAA | Hovered rows / ghost buttons |
| `ink` | `selected-bg` | 13.80 | AAA | Selected rows |
| `ink-muted` | `surface` | 3.51 | AA Large | Use only at ≥ 14pt bold / ≥ 18pt regular |
| `ink-muted` | `surface-subtle` | 3.42 | AA Large | Table header (`eyebrow`, uppercase, 11/600) — accepted carve-out, see Known Risks |
| `ink-subtle` | `surface` | 2.37 | Sub-AA | Placeholder and helper text only — not for content text |
| `on-accent` | `accent` | 5.30 | AA | `button-primary` |
| `on-accent` | `accent-hover` | 8.05 | AAA | Hover state |
| `on-accent` | `accent-pressed` | 12.08 | AAA | Pressed state |
| `on-accent` | `danger` | 5.32 | AA | `button-danger` |
| `accent` | `info-subtle` | 4.55 | AA | `button-tint`, `status-pill-info`, `nav-item-active` |
| `accent` | `selected-bg` | 4.55 | AA | Same swatch as `info-subtle` |
| `success` | `success-subtle` | 3.18 | AA Large | `status-pill-success` — pair status pills with an icon, see Known Risks |
| `warning` | `warning-subtle` | 3.25 | AA Large | `status-pill-warning` — pair status pills with an icon, see Known Risks |
| `danger` | `danger-subtle` | 4.62 | AA | `status-pill-danger`, `error-banner` |
| `accent` | `surface` | 5.30 | AA (non-text) | Active tab underline, focused border |
| `hairline` | `surface` | 1.36 | Sub-AA (non-text) | Decorative, never the sole state indicator — see Known Risks |
| `hairline-strong` | `surface` | 1.66 | Sub-AA (non-text) | Same carve-out as `hairline` |
| `accent-focus-ring` | `surface` | 2.11 | Sub-AA (non-text) | Paired with a `2px` accent border on the focused element, see Known Risks |
| `disabled-fg` | `disabled-bg` | 2.13 | Exempt | Disabled controls (WCAG 1.4.3) |

**Motion**

Motion is timed in the markdown body rather than as YAML tokens (same lint-compat reason as breakpoints). Generated code should reference these names via CSS custom properties or a local design-token map.

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| `motion.instant` | 0ms | linear | Color, border, and background-color transitions on hover/focus |
| `motion.fast` | 120ms | cubic-bezier(0.2, 0, 0, 1) | Button press, chip selection, tab underline |
| `motion.standard` | 200ms | cubic-bezier(0.2, 0, 0, 1) | Popover / dropdown reveal, toast in |
| `motion.slow` | 280ms | cubic-bezier(0.2, 0, 0, 1) | Modal, drawer, detail-panel slide |
| `motion.exit` | 160ms | cubic-bezier(0.4, 0, 1, 1) | Overlay dismiss, toast out |

**Reduced Motion**
Honor `prefers-reduced-motion: reduce` on every transition that moves, scales, or fades. The fallback is an instant state change (`duration: 0ms`) — never a fade-only substitute, which still implies motion. Loading indicators may keep a reduced-amplitude pulse (≤ 20% opacity delta) but must not spin.

**Keyboard & Focus**
- Every interactive control must render the `2px {colors.accent-focus-ring}` shadow on `:focus-visible`, paired with a `1px` accent border on the focused element so the combined indicator meets the 3:1 non-text contrast bar even when the ring alone does not.
- Tab order follows DOM order; do not use positive `tabindex`. Toolbar → filters → table header → table rows → detail panel → footer actions is the canonical scan order for a list page.
- Provide a "Skip to main content" link as the first focusable element of every page; it is visually hidden until focused, then renders as a `button-secondary` pinned to the top-left of the viewport.
- Modal, drawer, and command-palette overlays trap focus: focus moves to the first focusable element on open, cycles within the overlay, and returns to the trigger on close. `Escape` dismisses; clicking the scrim dismisses unless the overlay is a destructive confirmation.
- Popovers and dropdowns do not trap focus — arrow keys move within the list, `Escape` closes, `Tab` closes and continues to the next page element.

**Known Accessibility Risks**

These are deliberate carve-outs documented as risks until the next color/token revision. Generated pages do not need to fix them but must not make them worse.

1. **Status pill text** (`success`, `warning` on their `-subtle` fills) sits at 3.18 / 3.25:1 — AA-large only. `label-sm` is 12px/600, below the 14pt-bold large-text threshold. Mitigation: status pills must include a leading status icon so identity is not carried by color alone (WCAG 1.4.1).
2. **Focus ring** (`accent-focus-ring` on `surface`) is 2.11:1. Mitigation: the focused element also gets a `1px {colors.accent}` border, lifting the combined indicator above 3:1. Do not ship the ring on its own.
3. **Hairline borders** are 1.36 / 1.66:1 against `surface`. Mitigation: borders are never the sole state indicator — every state additionally changes background fill, text weight, or both. Where a border alone must carry meaning (e.g., active tab underline), use `colors.accent` instead.
4. **`ink-subtle` text** (2.37:1) is reserved for placeholders, helper text, and decorative labels. Do not use it for content the user must read to act.

When the upstream Synapse palette refresh lands, re-run the contrast script and tighten the rows above so the matrix closes these risks rather than carving around them.

## Agent Prompt Guide

**Quick Color Reference**
- `accent` — primary action, active state, focus
- `ink` / `ink-muted` — text on surface
- `surface` / `surface-subtle` — background pair
- `hairline` — every persistent border
- `selected-bg` / `hover-bg` — row state
- `success` / `warning` / `danger` — semantic strong + matching `-subtle`

**Ready-to-use Prompts**
- "Generate a data table with sortable columns, selectable rows, and a sticky header using `table-header-cell`, `table-row`, `table-row-hover`, `table-row-selected`, `checkbox`, and `table-cell-numeric`."
- "Generate a filter bar inside a `toolbar` with chip-style filters (`filter-chip`, `filter-chip-active`) and a clear-all `button-ghost`."
- "Generate an empty state for a filtered list with no results using `empty-state`, `headline-md`, body-md text in `ink-muted`, and a `button-secondary` to clear filters."
- "Generate a detail panel that slides in from the right using `detail-panel`, `title-sm`, body-md content rows, and a sticky footer with `button-primary` + `button-secondary`."
- "Generate a status pill matrix showing all semantic variants (`status-pill-success`, `-warning`, `-danger`, `-info`, `-neutral`) inside a `card-default` for documentation."

## Iteration Guide

1. Work in component-sized increments; reference components by their `components.*` token name in every prompt and diff.
2. When a new visual pattern appears in product work, update this file before touching code.
3. Every interactive component must ship `-hover`, `-focused`, and `-disabled` tokens; add `-selected` / `-active` / `-pressed` / `-error` where the interaction calls for it.
4. Run `npx synapse-design-md check` against the working branch to detect off-token colors, sizes, and shadows.
5. Token edits must pass `synapse-design-md eval` and ship with regenerated goldens in the same commit.
6. New components register as their own token entries; never extend an existing component with a variant flag in code instead of a token.
7. Treat the `description` block as part of the contract — if the operational atmosphere changes (dark mode, new density mode), revise the description in the same change that introduces the new tokens.

## Known Gaps

- 11 bespoke design-system colors (`accent-focus-ring`, `ink-subtle`, `hairline-strong`, the four `*-subtle` semantic pairs, `selected-bg`, `hover-bg`, `disabled-bg`, `disabled-fg`) are intentional non-palette values but lack rendered-evidence confirmation — they manifest only on hover/focus/disabled states that the layer-4 crawl does not currently exercise. Extending `crawl` to trigger and sample those states is a follow-up to issue #9.
- `Source pages` comment under Colors is empty until the first authenticated crawl run lands.
- Dark mode is undefined; first pass is light-only because operational sessions run on managed displays.
- Form validation visuals beyond `input-error` (helper text styling, inline error rows, multi-field error summaries) are not specified.
- Internationalization adjustments (RTL mirroring of `app-shell-nav` and `detail-panel`, CJK line-height correction for body-sm and label-sm) are not specified.
