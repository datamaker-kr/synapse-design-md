---
version: beta
name: Synapse
description: Synapse product design contract synced from synapse-workspace tailwind theme.
x-synapse-design-md:
  packageVersion: __PACKAGE_VERSION__
  source: synapse-design-md
  syncedFrom: synapse-workspace/lib/tailwind/theme

colors:
  ink: "#182134"
  muted: "#7B8AA0"
  border: "#D6DEE8"
  surface: "#FFFFFF"
  surfaceSubtle: "#FBFCFD"
  accent: "#2461E9"
  accentHover: "#1E44BC"
  accentActive: "#1B3174"
  success: "#009D53"
  warning: "#BB7C05"
  danger: "#D02323"

typography:
  headline-lg:
    fontFamily: "\"Pretendard Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 30px
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: "\"Pretendard Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 24px
    lineHeight: 32px
    letterSpacing: -0.019em
  title-sm:
    fontFamily: "\"Pretendard Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    lineHeight: 24px
    letterSpacing: -0.011em
  body-md:
    fontFamily: "\"Pretendard Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    lineHeight: 20px
    letterSpacing: -0.006em
  label-sm:
    fontFamily: "\"Pretendard Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    lineHeight: 16px
    letterSpacing: 0em

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px

rounded:
  sm: 4px
  md: 6px
  lg: 8px

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

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    hoverBackgroundColor: "{colors.accentHover}"
    activeBackgroundColor: "{colors.accentActive}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    paddingInline: 16px
    paddingBlock: 6px
  button-tint:
    backgroundColor: "#E6F0FF"
    textColor: "{colors.accent}"
    rounded: "{rounded.lg}"
    paddingInline: 16px
    paddingBlock: 6px
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    paddingInline: "{spacing.md}"
    paddingBlock: "{spacing.sm}"
---

## Overview

Synapse UI is an operational product surface. It should feel precise, calm, and dense enough for repeated professional use. Prefer structured layouts, restrained visual emphasis, clear status hierarchy, and compact controls over marketing-style composition.

Tokens in the frontmatter are synced from `synapse-workspace/lib/tailwind/theme` via `synapse-design-md sync`. Edit `scripts/semantic-aliases.json` and re-run the command to retune; do not hand-edit the frontmatter.

## Colors

Use neutral surfaces for most layout structure and reserve accent color for primary actions, active navigation, selected states, and important links. Status colors should communicate state only; do not use success, warning, or danger as decorative brand colors.

Avoid raw hex values in implementation code. If a new color is necessary, add it here with a semantic name and update the evaluator thresholds.

## Typography

Use `headline-lg` only for page-level titles. Use `headline-md` for major content regions, `title-sm` for cards and table sections, `body-md` for dense product copy, and `label-sm` for metadata, filters, badges, and field labels.

Text should fit inside controls without viewport-scaled font sizes. Use the letter-spacing values from the synced typography scale; do not override them per element.

## Layout

Use compact, predictable layouts optimized for scanning. Page templates should preserve app-shell navigation, content headers, toolbar actions, filter rows, tables, and detail panels as distinct regions.

Use spacing tokens instead of arbitrary gaps. Repeated controls should keep stable dimensions so labels, icons, and loading states do not shift the layout.

## Elevation & Depth

Prefer borders, subtle background changes, and tonal separation over heavy shadows. Use shadow only for overlays such as modal, popover, dropdown, and drawer surfaces.

## Shapes

Use small to medium radius values. Cards and panels should remain at 8px radius or less unless a captured Synapse source page proves a larger shape.

## Sizes

The `sizes` tokens cover recurring fixed widths and heights — modal bodies, action button minimums, control heights, and form/page columns. Reach for these before introducing a new `w-[…]`, `h-[…]`, or `min-w-[…]` arbitrary value. New entries should appear in at least four call sites before being promoted from arbitrary to semantic.

Avoid expressing Tailwind default scale values via arbitrary syntax (use `w-60` over `w-[15rem]`). Arbitrary syntax is reserved for genuine custom values that warrant a `sizes` token.

## Components

Primary buttons should be visually distinct but compact. Tables should prioritize aligned columns, readable density, sort/filter affordances, selected rows, and empty/loading/error states. Forms should group related fields with clear labels and validation messages close to the failing field.

Do not create route-local clones of shared product surfaces. If a pattern recurs, document it as an organism or molecule example before reuse.

## Do's and Don'ts

Do:
- read this file before user-facing UI changes
- use semantic tokens for color, type, spacing, and shape
- preserve product density and interaction states
- update this file before introducing a new visual pattern

Don't:
- use decorative gradients, oversized hero sections, or marketing cards for app workflows
- add raw one-off colors or arbitrary font sizes in product code
- duplicate shared UI patterns inside route-specific files
- commit authenticated screenshots, cookies, storage state, or customer data
