<!-- synapse-design-md:start version=0.2.0 -->
## Synapse Design Contract

Before changing user-facing UI, read `DESIGN.md`.

Frontend changes must preserve the Synapse visual system:
- use the color, typography, spacing, radius, and component guidance from `DESIGN.md`
- avoid raw one-off colors, arbitrary font sizes, and route-local component clones
- preserve interaction states, density, and responsive behavior described in `DESIGN.md`
- meet **WCAG 2.2 AA** on text and active controls; back every new color pair with a measured contrast ratio against the matrix in `DESIGN.md` → *Accessibility*
- use the `motion.*` durations and easings from `DESIGN.md` → *Accessibility* → *Motion*, and honor `prefers-reduced-motion: reduce` by collapsing transitions to 0ms
- ship a visible `:focus-visible` indicator (2px `accent-focus-ring` shadow + 1px `accent` border), DOM-order tab traversal, and overlay focus traps for modal / drawer / command palette

For UI changes, run:

```bash
npx synapse-design-md check
```

To visually verify token changes against the contract, regenerate the catalog:

```bash
npx synapse-design-md preview
```

When adding new visual patterns, update `DESIGN.md` first (including the state variant tokens — `-hover`, `-focused`, `-disabled`) or explain why the existing contract is insufficient.
<!-- synapse-design-md:end -->
