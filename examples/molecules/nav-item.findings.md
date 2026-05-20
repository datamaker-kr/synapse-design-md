# nav-item — Findings (production vs design intent)

Source: `evidence/contracts/nav-item/2026-05-20T03-13-12-590Z.probe.json`
Capture: `https://test.synapse.sh/datamaker/projects`, selector `header a[href]`, selected via `header a.router-link-active`
Compared against: `nav-item.contract.aspirational.json`

Verifier output (38 violations across 6 axes) reduces to **five systemic gaps** when grouped by root cause. Each is independently actionable.

---

## Gap #1 — Untokenized `text-muted` color (token coverage hole)

**Observed.** Default nav-item color is `rgb(93, 108, 131)` (`#5D6C83`). No DESIGN.md token resolves to this value.

**Impact.** The production color drifts silently when DESIGN.md is updated. Designers and consumers cannot reason about "what is the muted text token here" from the design system alone — they must read CSS.

**Closest existing token.** `colors.ink-muted` (`#7B8AA0`) — visually similar but not byte-equal.

**Options.**
- (a) Add `#5D6C83` to `templates/DESIGN.md` (`colors.ink-strong-muted`?) and use it in nav-item.
- (b) Migrate nav-item to use the existing `colors.ink-muted` and accept the visual delta.
- (c) Document the deviation in DESIGN.md's accessibility carve-outs.

**Recommendation.** (b) — closing the drift toward the existing token. Production hex deltas are noise the verifier should not have to whitelist.

---

## Gap #2 — Selected state encoded by color only

**Observed.** `header a.router-link-active` shifts color from `#5D6C83` → `#182134` (`colors.ink`). No geometry change (no underline, bar, badge, or background).

**Impact.** Color-blind users (~8% of male users for red-green; smaller % for blue-yellow) cannot reliably identify the active page. WCAG 1.4.1 *Use of Color* failure if color is the *only* visual means of conveying information.

**Aspirational target.** 2px leading-edge bar in `colors.accent` (`#2461E9`), in addition to the color shift.

**Implementation hint.** `::before` pseudo-element with `position: absolute; left: 0; width: 2px; height: 100%; background: var(--colors-accent)`. Zero layout impact.

---

## Gap #3 — No state-change transition

**Observed.** `transition-property: none`. Color flips instantaneously on hover and route change.

**Impact.** Reads as harsh; obscures whether a click registered (the visual feedback is identical-instant). On slow connections the user may not perceive that hover triggered.

**Aspirational target.** 120ms `cubic-bezier(0.2, 0, 0, 1)` on `color`; 160ms same easing on route-driven state change. Both honor `prefers-reduced-motion: reduce` (instantaneous fallback).

**Cost.** One CSS rule. No layout change.

---

## Gap #4 — No `aria-current` attribute

**Observed.** Active link is signaled only by Vue Router's class `.router-link-active`. No ARIA attribute is added.

**Impact.** Screen readers (NVDA/JAWS/VoiceOver) cannot announce "current page". Users navigating via headings/landmarks must infer location from page content. WCAG 4.1.2 *Name, Role, Value* — partial failure for navigation context.

**Aspirational target.** Emit `aria-current="page"` on the active link, in addition to the class.

**Implementation hint.** Vue Router supports `aria-current` natively via `<RouterLink>` — it's a one-prop change.

---

## Gap #5 — Browser-default focus outline

**Observed.** `outline-style: auto`, `outline-width: 1px`, `outline-color: rgb(0, 95, 204)` (Chromium's default focus color). No design-system ring.

**Impact.** Focus treatment varies by browser and operating system. Themes (dark mode, high-contrast) cannot inherit or override consistently. The outline color also clashes subtly with `colors.accent` (`#2461E9` vs `#005FCC`).

**Aspirational target.** 2px solid `colors.accent-focus-ring` (`#93B3F0`), 2px offset, composes with every other state.

**Implementation hint.** Single global rule:
```css
:focus-visible {
  outline: 2px solid var(--colors-accent-focus-ring);
  outline-offset: 2px;
}
```

---

## Severity & verifier behavior

| Axis | Gap | Descriptive verifier | Aspirational verifier |
| --- | --- | --- | --- |
| style — color | #1 | (matches production — PASS) | warn: token missing |
| style — indicator | #2 | (matches — PASS) | warn: indicator required |
| motion | #3 | (matches — PASS) | warn: motion required |
| a11y — current | #4 | (matches — PASS) | warn: aria-current required |
| style — focus | #5 | (matches — PASS) | warn: focus ring token required |

A consumer build that **exactly mirrors production** passes the descriptive contract (CI green) and surfaces the aspirational gaps as a warn-level backlog. As gaps get closed in production, the descriptive contract is re-captured from a fresh crawl, and the aspirational↔descriptive gap shrinks.
