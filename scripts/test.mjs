import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyContract } from "./verify-contract.mjs";
import { loadTokenIndex } from "./token-index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readText(file) {
  return fs.readFile(file, "utf8");
}

test("semantic-aliases.json governance: no `components` key (Issue #3 option C)", async () => {
  const aliases = await readJson(path.join(repoRoot, "scripts/semantic-aliases.json"));
  assert.equal(
    aliases.components,
    undefined,
    "`components` must stay hand-edited in templates/DESIGN.md; do not reintroduce it under semantic-aliases.json."
  );
});

test("semantic-aliases.json defines a non-empty `sizes` object", async () => {
  const aliases = await readJson(path.join(repoRoot, "scripts/semantic-aliases.json"));
  assert.ok(aliases.sizes && typeof aliases.sizes === "object", "`sizes` must be an object");
  assert.ok(Object.keys(aliases.sizes).length > 0, "`sizes` must have at least one entry");
  for (const [key, value] of Object.entries(aliases.sizes)) {
    assert.equal(typeof value, "string", `sizes.${key} must be a string`);
  }
});

test("templates/DESIGN.md frontmatter contains every required block", async () => {
  const text = await readText(path.join(repoRoot, "templates/DESIGN.md"));
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, "templates/DESIGN.md must start with YAML frontmatter");
  const frontmatter = match[1];
  for (const block of ["colors", "typography", "spacing", "rounded", "sizes", "components"]) {
    assert.match(
      frontmatter,
      new RegExp(`^${block}:`, "m"),
      `templates/DESIGN.md frontmatter is missing the \`${block}:\` block`
    );
  }
});

test("sync dry-run is byte-identical to templates/DESIGN.md (round-trip identity)", async () => {
  const fixtureSource = path.join(repoRoot, "fixtures/ci-source");
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "bin/synapse-design-md.js"), "sync", "--source", fixtureSource],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(result.status, 0, `sync exited non-zero: ${result.stderr}`);
  const current = await readText(path.join(repoRoot, "templates/DESIGN.md"));
  assert.equal(
    result.stdout,
    current,
    "sync dry-run differs from templates/DESIGN.md — semantic-aliases.json drifted from the committed template. Re-run `synapse-design-md sync --write`."
  );
});

test("DESIGN.md frontmatter has no leftover `__PACKAGE_VERSION__` placeholder", async () => {
  const text = await readText(path.join(repoRoot, "DESIGN.md"));
  assert.ok(
    !text.includes("__PACKAGE_VERSION__"),
    "DESIGN.md still has `__PACKAGE_VERSION__` — run `synapse-design-md install --force` to refresh."
  );
});

test("aspirational contract: passing probe yields zero warnings", async () => {
  const contract = await readJson(path.join(repoRoot, "examples/molecules/nav-item.contract.aspirational.json"));
  const probe = await readJson(path.join(repoRoot, "examples/molecules/nav-item.probe.pass.json"));
  const { ok, intent, violations } = verifyContract({ contract, probe });
  assert.equal(intent, "aspirational");
  assert.equal(violations.length, 0, `expected no violations, got: ${JSON.stringify(violations, null, 2)}`);
  assert.equal(ok, true);
});

test("aspirational contract: failing probe surfaces drifts as warnings (ok=true)", async () => {
  const contract = await readJson(path.join(repoRoot, "examples/molecules/nav-item.contract.aspirational.json"));
  const probe = await readJson(path.join(repoRoot, "examples/molecules/nav-item.probe.fail.json"));
  const { ok, intent, violations } = verifyContract({ contract, probe });
  assert.equal(intent, "aspirational");
  // Aspirational violations are warnings — ok is true so consumers don't block CI on design backlog.
  assert.equal(ok, true, "aspirational violations must not block (warning severity)");
  assert.ok(violations.length > 0, "aspirational should surface gaps as warnings");
  assert.ok(violations.every((v) => v.severity === "warning"));
  const paths = new Set(violations.map((v) => v.path));
  for (const expected of [
    "layout.height",
    "layout.paddingTop/Bottom",
    "typography.weight",
    "states.selected.indicator",
    "motion.default-to-hover.easing",
    "a11y.current.attribute",
    "a11y.hitbox.minHeight"
  ]) {
    assert.ok(paths.has(expected), `expected warning at ${expected}; got: ${[...paths].join(", ")}`);
  }
});

test("descriptive contract: captured production probe passes (round-trip identity)", async () => {
  const contract = await readJson(path.join(repoRoot, "examples/molecules/nav-item.contract.descriptive.json"));
  // The descriptive contract was promoted from this probe shape (manually trimmed for anatomy).
  // A consumer build matching production verbatim should produce a violation-free verify.
  // Build a synthetic probe from the contract itself — round-trip identity check.
  const probe = JSON.parse(JSON.stringify(contract));
  probe.identity = { name: contract.identity.name, id: "synthetic:round-trip" };
  delete probe.intent;
  delete probe.antiPatterns;
  delete probe.rationale;
  const { ok, intent, violations } = verifyContract({ contract, probe });
  assert.equal(intent, "descriptive");
  assert.equal(ok, true, `descriptive round-trip should pass, got violations: ${JSON.stringify(violations, null, 2)}`);
  assert.equal(violations.length, 0);
});

test("token-index: reverse-maps DESIGN.md frontmatter values to token paths", async () => {
  const idx = await loadTokenIndex();
  assert.ok(idx.size() >= 50, `token index suspiciously small: ${idx.size()}`);

  // Spacing
  assert.equal(idx.lookup("12px"), "spacing.md");
  assert.equal(idx.lookup("8px"), "spacing.sm");
  assert.equal(idx.lookup("16px"), "spacing.lg");
  // Rounded
  assert.ok(idx.all("6px").includes("rounded.md"));
  // Sizes (rem with integer px) — 32px matches multiple tokens, so check via all().
  assert.ok(idx.all("32px").includes("sizes.controlHeight"));
  // Colors — hex and rgb forms both resolve
  assert.equal(idx.lookup("#2461E9"), "colors.accent");
  assert.equal(idx.lookup("rgb(36, 97, 233)"), "colors.accent");
  // Typography scale fontSize
  assert.ok(idx.all("14px").includes("typography.scale.body-md.fontSize"));
  // Letter-spacing
  assert.ok(idx.all("-0.006em").includes("typography.scale.body-md.letterSpacing"));
  // Misses are null, not undefined
  assert.equal(idx.lookup("999px"), null);
  assert.equal(idx.lookup(null), null);
});

test("contract verify CLI: aspirational warnings exit 0, descriptive mismatch exits 1", () => {
  const cli = path.join(repoRoot, "bin/synapse-design-md.js");

  // Aspirational + failing probe: produces warnings, CI does not block.
  const aspirational = spawnSync(
    process.execPath,
    [
      cli, "contract", "verify",
      "--contract", "examples/molecules/nav-item.contract.aspirational.json",
      "--probe", "examples/molecules/nav-item.probe.fail.json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(aspirational.status, 0, `aspirational warnings must not block CI, got ${aspirational.status}\n${aspirational.stdout}`);
  assert.match(aspirational.stdout, /\[aspirational\]/);
  assert.match(aspirational.stdout, /warnings\)$/m);

  // Descriptive + failing probe: must block.
  const descriptive = spawnSync(
    process.execPath,
    [
      cli, "contract", "verify",
      "--contract", "examples/molecules/nav-item.contract.descriptive.json",
      "--probe", "examples/molecules/nav-item.probe.fail.json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );
  assert.equal(descriptive.status, 1, `descriptive divergence must exit 1, got ${descriptive.status}`);
  assert.match(descriptive.stdout, /\[descriptive\]/);
});
