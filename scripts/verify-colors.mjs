#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fromRoot } from "./paths.mjs";

const sourceDir = path.resolve(
  process.cwd(),
  process.argv[2] || process.env.SYNAPSE_SOURCE || "../synapse-workspace"
);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const colors = await readDesignColors();
  const palette = await loadPalette(sourceDir);
  const reverseIndex = buildReverseIndex(palette);

  const rows = [];
  for (const [slot, hex] of Object.entries(colors)) {
    const palMatches = reverseIndex.get(hex.toUpperCase()) || [];
    const usage = palMatches.length === 0 ? grepHex(hex, sourceDir) : { matched: false, sites: [] };
    rows.push({ slot, hex, palette: palMatches, grep: usage });
  }

  printReport(rows);
}

async function readDesignColors() {
  const text = await fs.readFile(fromRoot("templates", "DESIGN.md"), "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/)[1];
  const colorsBlock = fm.match(/^colors:\n([\s\S]*?)(?=^[a-z])/m);
  if (!colorsBlock) throw new Error("colors: block not found in templates/DESIGN.md");
  const out = {};
  for (const line of colorsBlock[1].split("\n")) {
    const m = line.match(/^\s+([a-z-]+):\s*"(#[0-9A-Fa-f]+)"/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function loadPalette(dir) {
  const file = path.join(dir, "lib/tailwind/theme/colors.js");
  const probe = `import p from '${file}';process.stdout.write(JSON.stringify(p));`;
  const tmp = path.join(dir, ".synapse-palette-probe.mjs");
  await fs.writeFile(tmp, probe);
  try {
    const result = spawnSync("node", [tmp], { cwd: dir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`palette probe failed: ${result.stderr}`);
    return JSON.parse(result.stdout);
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

function buildReverseIndex(palette) {
  const index = new Map();
  for (const [name, shades] of Object.entries(palette)) {
    if (typeof shades !== "object" || shades === null) continue;
    for (const [shade, value] of Object.entries(shades)) {
      if (typeof value !== "string") continue;
      const hex = toHex(value);
      if (!hex) continue;
      const upper = hex.toUpperCase();
      const list = index.get(upper) || [];
      list.push(`${name}.${shade}`);
      index.set(upper, list);
    }
  }
  return index;
}

function toHex(value) {
  if (value.startsWith("#")) return value;
  const opaque = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*1(?:\.0+)?\s*)?\)$/);
  if (!opaque) return null;
  const [, r, g, b] = opaque;
  return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, "0").toUpperCase()).join("")}`;
}

function grepHex(hex, dir) {
  const variants = new Set([hex, hex.toUpperCase(), hex.toLowerCase()]);
  const sites = new Set();
  for (const needle of variants) {
    const result = spawnSync(
      "git",
      ["grep", "-l", "-F", "--", needle],
      { cwd: dir, encoding: "utf8" }
    );
    if (result.status === 0) {
      for (const line of result.stdout.trim().split("\n").filter(Boolean)) sites.add(line);
    }
  }
  return { matched: sites.size > 0, sites: [...sites].slice(0, 5) };
}

function printReport(rows) {
  const palBacked = rows.filter((r) => r.palette.length > 0);
  const grepBacked = rows.filter((r) => r.palette.length === 0 && r.grep.matched);
  const orphans = rows.filter((r) => r.palette.length === 0 && !r.grep.matched);

  console.log(`\n# Color verification report (${rows.length} slots)\n`);
  console.log(`- Palette-backed: ${palBacked.length} (authoritative — Tailwind palette match)`);
  console.log(`- Grep-backed:    ${grepBacked.length} (literal hex used somewhere in synapse-workspace)`);
  console.log(`- Orphan:         ${orphans.length} (not in palette, not found in source — likely true placeholders)\n`);

  const header = ["slot", "hex", "evidence"];
  const tableRows = rows.map((r) => {
    let evidence;
    if (r.palette.length > 0) evidence = `palette: ${r.palette.join(", ")}`;
    else if (r.grep.matched) evidence = `source: ${r.grep.sites.join(", ")}`;
    else evidence = "orphan — no source match";
    return [r.slot, r.hex, evidence];
  });
  printTable([header, ...tableRows]);

  if (orphans.length > 0) {
    console.log(`\nOrphan slots (consider crawl evidence or remove from DESIGN.md):`);
    for (const o of orphans) console.log(`  - ${o.slot} = ${o.hex}`);
  }
}

function printTable(rows) {
  const widths = rows[0].map((_, col) => Math.max(...rows.map((r) => String(r[col]).length)));
  for (const [index, row] of rows.entries()) {
    const formatted = row.map((cell, col) => String(cell).padEnd(widths[col])).join("  ");
    console.log(formatted);
    if (index === 0) console.log(widths.map((w) => "-".repeat(w)).join("  "));
  }
}
