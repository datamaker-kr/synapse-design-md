# button-primary — Findings (production vs design intent)

Source: `evidence/contracts/button-primary/2026-05-20T03-29-53-319Z.probe.json`
Capture: `https://test.synapse.sh/datamaker/projects`, "프로젝트 생성" button
Compared against: `button-primary.contract.aspirational.json` (derived from `templates/DESIGN.md#components:button-primary`)

Three systemic gaps emerge. Unlike nav-item, the button color tokens land correctly — the gap is dimensional and typographic.

---

## Gap #1 — Size variant drift (40px-tall, not 32px)

**Observed.** height 40px, paddingY 8px, paddingX 20px.

**Design target.** height 32px (`sizes.controlHeight`), paddingY 6px, paddingX 16px (`spacing.lg`).

**Impact.** Buttons sit 8px taller than the design system's control rhythm. Forms and toolbars that interleave inputs (32px) and buttons (40px) produce a noticeable vertical jitter.

**Options.**
- (a) Resize production buttons to 32px.
- (b) Add a `button-primary-lg` variant to DESIGN.md to legitimize 40px and document when each is used.

**Recommendation.** (b) if 40px is used intentionally for hero CTAs; otherwise (a).

---

## Gap #2 — Typography uses `title-sm` scale, not `button` scale

**Observed.** fontSize 16px, weight 400, lineHeight 24px — matches `typography.scale.title-sm`.

**Design target.** fontSize 13px, weight 600, lineHeight 16px — `typography.scale.button`.

**Impact.** Button labels render larger and *lighter* than designed. The 600 weight is what gives the primary button its visual gravity — production at 400 reads as a tinted link.

**Recommendation.** Apply the `typography.scale.button` slot to button labels. This is a single CSS rule change.

---

## Gap #3 — Focus ring delivered by transparent outline + (likely) Tailwind ring

**Observed.** `outline: 2px solid transparent; outline-offset: 2px; box-shadow: null`.

**Design target.** `box-shadow: 0 0 0 2px var(--colors-accent-focus-ring)` per DESIGN.md `button-primary-focused`.

**Impact.** The transparent outline plus an inferred Tailwind `ring-*` utility means the focus treatment depends on class composition order. If the ring class is overridden by another utility, focus becomes invisible — a silent accessibility regression.

**Recommendation.** Make the box-shadow primary; remove the transparent outline. Then the focus ring is a single rule, theme-able and immune to class ordering.

---

## Severity & verifier behavior

A consumer build that mirrors production passes the **descriptive** button-primary contract. The **aspirational** contract surfaces these three gaps as warnings for the design backlog.
