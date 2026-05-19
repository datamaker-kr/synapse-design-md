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
| Accessibility and contrast | 10 | Meets contrast expectations and keeps keyboard/focus affordances visible |
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
- accessibility or contrast output
- notes for any deliberate deviation from `DESIGN.md`

Authenticated captures must stay out of git unless they are explicitly anonymized and curated as `golden/` references.
