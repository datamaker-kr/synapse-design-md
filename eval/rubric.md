# Synapse Design Evaluation Rubric

Use this rubric to evaluate whether a generated or modified page follows `DESIGN.md`.

## Score Categories

| Category | Weight | Evidence |
| --- | ---: | --- |
| Color system | 20 | Uses semantic tokens, preserves contrast, avoids raw one-off colors |
| Typography | 15 | Keeps hierarchy, font family, size scale, line height, and label treatment |
| Spacing and layout rhythm | 15 | Uses spacing scale, stable dimensions, compact operational layout |
| Component consistency | 15 | Reuses documented page, organism, and molecule patterns |
| Interaction states | 10 | Includes hover, focus, active, selected, disabled, loading, empty, and error states |
| Responsive behavior | 10 | Works at desktop and mobile widths without overlap or clipped text |
| Accessibility and contrast | 10 | Meets the declared WCAG conformance level (Synapse default: 2.2 AA), backs every color pair with a measured contrast ratio, ships visible keyboard/focus affordances, and honors `prefers-reduced-motion` |
| Product tone | 5 | Feels like a professional Synapse product surface, not a generic landing page |

## Thresholds

Use `eval/thresholds.json` for automated checks. The default policy is:

- `overall >= 85`: pass
- `75 <= overall < 85`: warn
- `overall < 75`: fail

## Evidence Rules

Do not accept a passing score unless it is backed by concrete evidence:

- static scan results for token usage
- desktop and mobile screenshots
- automated contrast output from a real tool (axe, pa11y, Lighthouse-a11y, or a WCAG-formula calculation) — visual inspection alone does not satisfy the *Accessibility and contrast* category
- a comparison of measured ratios against the contrast matrix in `DESIGN.md`'s Accessibility section, citing any reused carve-out
- notes for any deliberate deviation from `DESIGN.md`

Authenticated captures must stay out of git unless they are explicitly anonymized and curated as `golden/` references.

## Category Notes

**Accessibility and contrast.** A passing score (category ≥ 9/10, matching the 90 threshold in `eval/thresholds.json`) requires all of:

1. declared WCAG conformance level for the surface under review (Synapse default: WCAG 2.2 AA on text and active controls);
2. measured contrast for every color pair the surface actually renders, compared to the matrix in `DESIGN.md`;
3. keyboard-only walkthrough notes covering tab order, `:focus-visible` indicator, skip-link behavior, and overlay focus traps;
4. confirmation that `prefers-reduced-motion: reduce` collapses motion durations to 0ms.

Surfaces that reuse documented carve-outs (status pill text on `-subtle` fills, hairline borders, focus-ring paired with `1px` accent border, `ink-subtle` placeholders) must cite the relevant *Known Accessibility Risks* entry in `DESIGN.md` rather than re-justifying them.
