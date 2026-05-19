#!/usr/bin/env node
// WCAG 2.x contrast-ratio calculator for the documented Synapse color pairs.
//
// Used as evidence for the contrast matrix in DESIGN.md → Accessibility, and as
// one of the accepted "automated contrast output" sources for the rubric.
//
// Usage:
//   node scripts/contrast.mjs                 # human-readable table
//   node scripts/contrast.mjs --json          # machine-readable rows
//
// When palette tokens change, re-run and update the matrix in templates/DESIGN.md
// (then `node ./bin/synapse-design-md.js install --force` to refresh DESIGN.md).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const m = hex.replace("#", "").match(/.{2}/g);
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(fg, bg) {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

function level(ratio, kind) {
  if (kind === "non-text") return ratio >= 3 ? "AA-nontext" : "Sub-AA-nontext";
  if (kind === "disabled") return "Exempt";
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Sub-AA";
}

const PAIRS = [
  ["ink", "surface", "text"],
  ["ink", "surface-subtle", "text"],
  ["ink", "hover-bg", "text"],
  ["ink", "selected-bg", "text"],
  ["ink-muted", "surface", "text"],
  ["ink-muted", "surface-subtle", "text"],
  ["ink-subtle", "surface", "text"],
  ["on-accent", "accent", "text"],
  ["on-accent", "accent-hover", "text"],
  ["on-accent", "accent-pressed", "text"],
  ["on-accent", "danger", "text"],
  ["accent", "info-subtle", "text"],
  ["accent", "selected-bg", "text"],
  ["success", "success-subtle", "text"],
  ["warning", "warning-subtle", "text"],
  ["danger", "danger-subtle", "text"],
  ["disabled-fg", "disabled-bg", "disabled"],
  ["accent", "surface", "non-text"],
  ["hairline", "surface", "non-text"],
  ["hairline-strong", "surface", "non-text"],
  ["accent-focus-ring", "surface", "non-text"]
];

async function loadPalette() {
  const designPath = path.join(repoRoot, "DESIGN.md");
  const text = await fs.readFile(designPath, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) throw new Error("DESIGN.md has no YAML frontmatter");
  const colorsBlock = fm[1].match(/\ncolors:\n([\s\S]*?)(?:\n[a-z][\w-]*:|\n---|$)/);
  if (!colorsBlock) throw new Error("colors block not found in DESIGN.md frontmatter");
  const palette = {};
  for (const line of colorsBlock[1].split("\n")) {
    const m = line.match(/^\s+([\w-]+):\s*"?(#[0-9a-fA-F]{3,8})"?\s*$/);
    if (m) palette[m[1]] = m[2];
  }
  return palette;
}

async function main() {
  const json = process.argv.includes("--json");
  const palette = await loadPalette();
  const rows = PAIRS.map(([fg, bg, kind]) => {
    const fgHex = palette[fg];
    const bgHex = palette[bg];
    if (!fgHex || !bgHex) {
      return { fg, bg, kind, error: "missing token in DESIGN.md frontmatter" };
    }
    const r = contrast(fgHex, bgHex);
    return {
      fg,
      bg,
      fgHex,
      bgHex,
      ratio: Math.round(r * 100) / 100,
      level: level(r, kind),
      kind
    };
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }

  console.log("Synapse contrast ratios (WCAG 2.x)");
  console.log("-".repeat(96));
  for (const r of rows) {
    if (r.error) {
      console.log(`${r.fg.padEnd(20)} on ${r.bg.padEnd(20)} ERROR: ${r.error}`);
      continue;
    }
    console.log(
      `${r.fg.padEnd(20)} on ${r.bg.padEnd(20)} ${r.fgHex}/${r.bgHex}  ${r.ratio
        .toFixed(2)
        .padStart(5)}:1  ${r.level.padEnd(15)} (${r.kind})`
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
