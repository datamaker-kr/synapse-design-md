import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
