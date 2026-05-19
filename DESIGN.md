---
version: alpha
name: Synapse
description: Synapse product design contract for consistent AI-assisted UI work.
x-synapse-design-md:
  packageVersion: 0.1.0
  source: synapse-design-md

colors:
  ink: "#111827"
  muted: "#6B7280"
  surface: "#FFFFFF"
  surfaceSubtle: "#F8FAFC"
  border: "#E5E7EB"
  accent: "#2563EB"
  accentHover: "#1D4ED8"
  success: "#059669"
  warning: "#D97706"
  danger: "#DC2626"

typography:
  headline-lg:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 650
    lineHeight: 1.2
  headline-md:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.25
  title-sm:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label-sm:
    fontFamily: Inter, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35

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

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    paddingInline: "{spacing.lg}"
    paddingBlock: "{spacing.md}"
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

This contract is a starting point. Replace placeholder tokens with values extracted from authenticated Synapse pages before publishing a stable release.

## Colors

Use neutral surfaces for most layout structure and reserve accent color for primary actions, active navigation, selected states, and important links. Status colors should communicate state only; do not use success, warning, or danger as decorative brand colors.

Avoid raw hex values in implementation code. If a new color is necessary, add it here with a semantic name and update the evaluator thresholds.

## Typography

Use `headline-lg` only for page-level titles. Use `headline-md` for major content regions, `title-sm` for cards and table sections, `body-md` for dense product copy, and `label-sm` for metadata, filters, badges, and field labels.

Text should fit inside controls without viewport-scaled font sizes. Keep letter spacing at zero unless a source Synapse page proves otherwise.

## Layout

Use compact, predictable layouts optimized for scanning. Page templates should preserve app-shell navigation, content headers, toolbar actions, filter rows, tables, and detail panels as distinct regions.

Use spacing tokens instead of arbitrary gaps. Repeated controls should keep stable dimensions so labels, icons, and loading states do not shift the layout.

## Elevation & Depth

Prefer borders, subtle background changes, and tonal separation over heavy shadows. Use shadow only for overlays such as modal, popover, dropdown, and drawer surfaces.

## Shapes

Use small to medium radius values. Cards and panels should remain at 8px radius or less unless a captured Synapse source page proves a larger shape.

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
