<!-- synapse-design-md:start version=0.1.0 -->
## Synapse Design Contract

Before changing user-facing UI, read `DESIGN.md`.

Frontend changes must preserve the Synapse visual system:
- use the color, typography, spacing, radius, and component guidance from `DESIGN.md`
- avoid raw one-off colors, arbitrary font sizes, and route-local component clones
- preserve interaction states, density, and responsive behavior described in `DESIGN.md`

For UI changes, run:

```bash
npx synapse-design-md check
```

When adding new visual patterns, update `DESIGN.md` first or explain why the existing contract is insufficient.
<!-- synapse-design-md:end -->
