import fs from "node:fs/promises";
import path from "node:path";

/**
 * verifyContract({ contract, probe })
 *
 * Property-level diff between a contract and a probe.
 * - contract: machine-readable spec produced by `contract crawl` (or hand-authored).
 * - probe:    same-shape JSON captured from a consumer build/page.
 *
 * Contract `intent` controls severity:
 *   - "descriptive" (default): violations are errors — consumer must match production.
 *   - "aspirational":          violations are warnings — gaps toward the design target.
 *
 * Returns: { ok, intent, violations: [{ axis, path, expected, actual, severity, hint? }] }
 */
export function verifyContract({ contract, probe }) {
  const intent = contract.intent || "descriptive";
  const violations = [];
  const ctx = { contract, probe, violations };

  diffLayout(ctx);
  diffTypography(ctx);
  diffIconSlot(ctx);
  diffHitbox(ctx);
  diffStates(ctx);
  diffMotion(ctx);
  diffA11y(ctx);
  diffComposition(ctx);

  // Map severity based on intent.
  const targetSeverity = intent === "aspirational" ? "warning" : "error";
  for (const v of violations) v.severity = targetSeverity;

  const ok = violations.every((v) => v.severity !== "error");
  return { ok, intent, violations };
}

function diffLayout({ contract, probe, violations }) {
  const c = contract.layout;
  const p = probe.layout ?? {};
  expectEq(violations, "layout", "layout.display", c.display, p.display);
  expectEq(violations, "layout", "layout.direction", c.direction, p.direction);
  expectEq(violations, "layout", "layout.align", c.align, p.align);
  expectEq(violations, "layout", "layout.justify", c.justify, p.justify);
  expectDim(violations, "layout", "layout.gap", c.gap, p.gap);
  expectDim(violations, "layout", "layout.height", c.height, p.height);
  expectDim(violations, "layout", "layout.paddingTop", c.paddingTop, p.paddingTop);
  expectDim(violations, "layout", "layout.paddingBottom", c.paddingBottom, p.paddingBottom);
  expectDim(violations, "layout", "layout.paddingLeft", c.paddingLeft, p.paddingLeft);
  expectDim(violations, "layout", "layout.paddingRight", c.paddingRight, p.paddingRight);

  // Optical: paddingTop must NOT equal paddingBottom — this is the baseline-correction tell.
  if (
    isNum(p.paddingTop?.value) &&
    isNum(p.paddingBottom?.value) &&
    p.paddingTop.value === p.paddingBottom.value &&
    c.paddingTop?.value !== c.paddingBottom?.value
  ) {
    violations.push({
      axis: "optical",
      path: "layout.paddingTop/Bottom",
      expected: `${c.paddingTop?.value}/${c.paddingBottom?.value} (asymmetric)`,
      actual: `${p.paddingTop.value}/${p.paddingBottom.value} (symmetric)`,
      severity: "error",
      hint: "Symmetric vertical padding misaligns label baseline. Use the asymmetric pair from the contract."
    });
  }

  // Border — radius non-zero must be expressed via a token.
  expectDim(violations, "layout", "layout.border.width", c.border?.width, p.border?.width);
  expectDim(violations, "layout", "layout.border.radius", c.border?.radius, p.border?.radius);
}

function diffTypography({ contract, probe, violations }) {
  const c = contract.typography;
  const p = probe.typography ?? {};
  expectEq(violations, "style", "typography.family", c.family, p.family);
  expectDim(violations, "style", "typography.size", c.size, p.size);
  expectEq(violations, "style", "typography.weight", c.weight, p.weight);
  expectDim(violations, "style", "typography.lineHeight", c.lineHeight, p.lineHeight);
  expectDim(violations, "style", "typography.letterSpacing", c.letterSpacing, p.letterSpacing);
  expectEq(violations, "style", "typography.fontFeatureSettings", c.fontFeatureSettings, p.fontFeatureSettings);
  expectEq(violations, "style", "typography.whiteSpace", c.whiteSpace, p.whiteSpace);
}

function diffIconSlot({ contract, probe, violations }) {
  if (!contract.iconSlot) return;
  const c = contract.iconSlot;
  const p = probe.iconSlot ?? {};
  expectDim(violations, "optical", "iconSlot.size", c.size, p.size);
  expectEq(violations, "optical", "iconSlot.position", c.position, p.position);
  expectDim(violations, "optical", "iconSlot.baselineOffsetY", c.baselineOffsetY, p.baselineOffsetY);
}

function diffHitbox({ contract, probe, violations }) {
  if (!contract.hitbox) return;
  const c = contract.hitbox;
  const p = probe.hitbox ?? {};
  expectMinDim(violations, "a11y", "a11y.hitbox.minWidth", c.minWidth, p.minWidth);
  expectMinDim(violations, "a11y", "a11y.hitbox.minHeight", c.minHeight, p.minHeight);
}

function diffStates({ contract, probe, violations }) {
  for (const [stateName, cState] of Object.entries(contract.states ?? {})) {
    // A null contract entry means "this state is intentionally absent" — no expectation to verify.
    if (cState === null) continue;
    const pState = probe.states?.[stateName];
    if (!pState) {
      violations.push({
        axis: "style",
        path: `states.${stateName}`,
        expected: "defined",
        actual: "missing"
      });
      continue;
    }
    for (const [key, cVal] of Object.entries(cState)) {
      if (key === "comment" || key === "composesWith") continue;
      const pVal = pState[key];
      if (cVal && typeof cVal === "object" && "token" in cVal) {
        if (!pVal || typeof pVal !== "object" || pVal.token !== cVal.token) {
          violations.push({
            axis: "style",
            path: `states.${stateName}.${key}`,
            expected: `token:${cVal.token}`,
            actual: pVal == null ? "missing" : describe(pVal),
            hint: "Raw values must be replaced by the contract token. Re-derive from DESIGN.md tokens."
          });
        }
      } else if (cVal && typeof cVal === "object" && "geometry" in cVal) {
        // Selected indicator geometry — deep compare.
        diffIndicator(violations, stateName, cVal, pVal);
      } else if (cVal && typeof cVal === "object" && "raw" in cVal && !("value" in cVal)) {
        // Untokenized color — equality on raw value.
        const pRaw = (pVal && typeof pVal === "object") ? pVal.raw : pVal;
        if (pRaw !== cVal.raw) {
          violations.push({
            axis: "style",
            path: `states.${stateName}.${key}`,
            expected: `raw:${cVal.raw}`,
            actual: pVal == null ? "missing" : describe(pVal)
          });
        }
      } else if (typeof cVal === "object" && cVal !== null) {
        // Dimension { value, unit, token? }
        expectDim(violations, "style", `states.${stateName}.${key}`, cVal, pVal);
      } else {
        expectEq(violations, "style", `states.${stateName}.${key}`, cVal, pVal);
      }
    }
  }
}

function diffIndicator(violations, stateName, c, p) {
  const at = `states.${stateName}.indicator`;
  if (!p || p === "none") {
    violations.push({
      axis: "style",
      path: at,
      expected: `bar ${c.thickness?.value}${c.thickness?.unit} ${c.position}`,
      actual: "none",
      severity: "error",
      hint: "Selected state requires a visible indicator. Color change alone is not sufficient."
    });
    return;
  }
  expectEq(violations, "style", `${at}.geometry`, c.geometry, p.geometry);
  expectDim(violations, "style", `${at}.thickness`, c.thickness, p.thickness);
  expectEq(violations, "style", `${at}.position`, c.position, p.position);
  if (c.color?.token && p.color?.token !== c.color.token) {
    violations.push({
      axis: "style",
      path: `${at}.color`,
      expected: `token:${c.color.token}`,
      actual: p.color == null ? "missing" : describe(p.color),
      severity: "error"
    });
  }
}

function diffMotion({ contract, probe, violations }) {
  for (const [name, cM] of Object.entries(contract.motion ?? {})) {
    const pM = probe.motion?.[name];
    if (!pM) {
      violations.push({
        axis: "motion",
        path: `motion.${name}`,
        expected: "defined",
        actual: "missing",
        severity: "error"
      });
      continue;
    }
    expectEq(violations, "motion", `motion.${name}.property`, cM.property, pM.property);
    expectDim(violations, "motion", `motion.${name}.duration`, cM.duration, pM.duration);
    expectEq(violations, "motion", `motion.${name}.easing`, cM.easing, pM.easing);
  }
}

function diffA11y({ contract, probe, violations }) {
  const c = contract.a11y;
  const p = probe.a11y ?? {};
  expectEq(violations, "a11y", "a11y.role", c.role, p.role);
  if (c.current) {
    expectEq(violations, "a11y", `a11y.current.attribute`, c.current.attribute, p.current?.attribute);
    expectEq(
      violations,
      "a11y",
      `a11y.current.expectedValueWhenSelected`,
      c.current.expectedValueWhenSelected,
      p.current?.expectedValueWhenSelected
    );
  }
}

function diffComposition({ contract, probe, violations }) {
  const c = contract.composition;
  const p = probe.composition ?? {};
  if (!c) return;
  expectEq(violations, "composition", "composition.parent", c.parent, p.parent);
  for (const [slot, cChild] of Object.entries(c.children ?? {})) {
    const pChild = p.children?.[slot];
    if (!pChild) continue;
    const cAllowed = new Set(cChild.allowed ?? []);
    for (const node of pChild.allowed ?? []) {
      if (!cAllowed.has(node)) {
        violations.push({
          axis: "composition",
          path: `composition.children.${slot}`,
          expected: `one of [${[...cAllowed].join(", ")}]`,
          actual: node,
          severity: "error"
        });
      }
    }
  }
}

// helpers ------------------------------------------------------------

function expectEq(violations, axis, at, expected, actual) {
  if (expected === undefined) return;
  if (expected !== actual) {
    violations.push({
      axis,
      path: at,
      expected,
      actual: actual === undefined ? "missing" : actual,
      severity: "error"
    });
  }
}

function expectDim(violations, axis, at, expected, actual) {
  if (!expected) return;
  if (!actual || typeof actual !== "object") {
    violations.push({ axis, path: at, expected: describe(expected), actual: "missing", severity: "error" });
    return;
  }
  if (expected.value !== actual.value || expected.unit !== actual.unit) {
    violations.push({
      axis,
      path: at,
      expected: `${expected.value}${expected.unit}`,
      actual: `${actual.value ?? "?"}${actual.unit ?? ""}`,
      severity: "error"
    });
    return;
  }
  // Token enforcement: if contract declares a token, probe must declare it too.
  if (expected.token && expected.token !== actual.token) {
    violations.push({
      axis,
      path: `${at}.token`,
      expected: expected.token,
      actual: actual.token ?? "raw value",
      severity: "error",
      hint: "Use the token, not the raw value — raw values bypass DESIGN.md updates."
    });
  }
}

function expectMinDim(violations, axis, at, expected, actual) {
  if (!expected) return;
  if (!actual || !isNum(actual.value) || actual.value < expected.value) {
    violations.push({
      axis,
      path: at,
      expected: `>= ${expected.value}${expected.unit}`,
      actual: actual ? `${actual.value}${actual.unit}` : "missing",
      severity: "error"
    });
  }
}

function isNum(x) { return typeof x === "number" && Number.isFinite(x); }

function describe(v) {
  if (v == null) return String(v);
  if (typeof v !== "object") return String(v);
  if ("value" in v && "unit" in v) return `${v.value}${v.unit}${v.token ? ` (${v.token})` : ""}`;
  return JSON.stringify(v);
}

// CLI entry ----------------------------------------------------------

export async function verifyContractCmd(options = {}) {
  if (!options.contract || !options.probe) {
    throw new Error("Usage: synapse-design-md contract verify --contract <path> --probe <path>");
  }
  // Multiple --contract flags accumulate; parseArgs squashes duplicates so split on comma too.
  const contractPaths = String(options.contract).split(",").filter(Boolean);
  const probePath = path.resolve(process.cwd(), options.probe);
  const probe = JSON.parse(await fs.readFile(probePath, "utf8"));

  let anyError = false;
  for (const c of contractPaths) {
    const contractPath = path.resolve(process.cwd(), c);
    const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
    const { ok, intent, violations } = verifyContract({ contract, probe });
    printReport({ contract, probe, ok, intent, violations });
    if (!ok) anyError = true;
  }
  if (anyError) process.exitCode = 1;
}

export function printReport({ contract, probe, ok, intent, violations }) {
  const name = contract?.identity?.name ?? "?";
  const probeId = probe?.identity?.name ?? probe?.identity?.id ?? path.basename(process.argv[3] || "probe");
  console.log(`\nContract: ${name} [${intent}]   Probe: ${probeId}`);
  if (violations.length === 0) {
    console.log("  No violations.");
  } else {
    const grouped = {};
    for (const v of violations) (grouped[v.axis] ??= []).push(v);
    for (const [axis, list] of Object.entries(grouped)) {
      console.log(`\n  [${axis}] (${list.length})`);
      for (const v of list) {
        const tag = v.severity === "error" ? "✗" : "⚠";
        console.log(`    ${tag} ${v.path}`);
        console.log(`        expected: ${v.expected}`);
        console.log(`        actual:   ${v.actual}`);
        if (v.hint) console.log(`        hint:     ${v.hint}`);
      }
    }
  }
  const verdict = intent === "aspirational"
    ? (violations.length === 0 ? "ALIGNED" : "GAPS")
    : (ok ? "PASS" : "FAIL");
  console.log(`\nResult: ${verdict} (${violations.length} ${intent === "aspirational" ? "warnings" : "violations"})`);
}
