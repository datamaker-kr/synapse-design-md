/**
 * Build a reverse index from raw CSS values to DESIGN.md token paths.
 *
 *   px / rem dimensions  -> "spacing.md", "rounded.sm", "sizes.controlHeight"
 *   hex colors            -> "colors.accent", "colors.hover-bg", ...
 *   font sizes            -> "typography.scale.body-md.fontSize"
 *
 * The reverse index is the bridge between the browser's getComputedStyle
 * (which only knows raw values) and the contract format (which only accepts
 * tokens). Without it the crawler would emit raw 12px / #2461E9 and the
 * verifier would flag every measurement as a token-coverage hole.
 *
 * The parser deliberately handles only the simple, well-shaped frontmatter
 * blocks in templates/DESIGN.md. The `components:` block is intentionally
 * skipped — it consumes tokens by reference, not by definition.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

export async function loadTokenIndex(designMdPath = fromRoot("templates", "DESIGN.md")) {
  const text = await fs.readFile(designMdPath, "utf8");
  const fm = extractFrontmatter(text);
  const tokens = {
    colors: parseFlatBlock(fm, "colors"),
    spacing: parseFlatBlock(fm, "spacing"),
    rounded: parseFlatBlock(fm, "rounded"),
    sizes: parseFlatBlock(fm, "sizes"),
    typography: parseTypographyBlock(fm)
  };
  return buildIndex(tokens);
}

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error("templates/DESIGN.md missing YAML frontmatter");
  return m[1];
}

function parseFlatBlock(fm, name) {
  const block = fm.match(new RegExp(`^${name}:\\n([\\s\\S]*?)(?=^[a-zA-Z]|\\Z)`, "m"));
  if (!block) return {};
  const out = {};
  for (const raw of block[1].split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    // matches:  key: "value"   |   key: value   |   nested: { ... }  (skipped)
    const m = line.match(/^\s{2,}([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*("([^"]*)"|([^\s{][^\n]*?))\s*$/);
    if (!m) continue;
    const key = m[1];
    const value = (m[3] ?? m[4] ?? "").trim();
    if (!value) continue;
    out[key] = value;
  }
  return out;
}

function parseTypographyBlock(fm) {
  const scaleMatch = fm.match(/^\s\sscale:\n([\s\S]*?)(?=^[a-zA-Z]|^\S|\Z)/m);
  if (!scaleMatch) return { fontFamily: {}, scale: {} };
  const scale = {};
  for (const raw of scaleMatch[1].split("\n")) {
    // matches:  name: { fontFamily: sans, fontSize: 14px, fontWeight: 400, lineHeight: 20px, letterSpacing: "-0.006em" }
    const m = raw.match(/^\s{4,}([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*\{(.+)\}\s*$/);
    if (!m) continue;
    const name = m[1];
    const body = m[2];
    const entry = {};
    for (const pair of body.split(",")) {
      const pm = pair.match(/^\s*([a-zA-Z]+)\s*:\s*(?:"([^"]*)"|([^\s,]+))\s*$/);
      if (!pm) continue;
      entry[pm[1]] = (pm[2] ?? pm[3] ?? "").trim();
    }
    scale[name] = entry;
  }
  return { scale };
}

function buildIndex(tokens) {
  const byValue = new Map();
  const addEntry = (value, tokenPath) => {
    if (!value) return;
    const key = normalize(value);
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key).push(tokenPath);
  };

  for (const [name, value] of Object.entries(tokens.colors)) {
    addEntry(value, `colors.${name}`);
    const rgb = hexToRgbString(value);
    if (rgb) addEntry(rgb, `colors.${name}`);
  }
  for (const [name, value] of Object.entries(tokens.spacing)) {
    addEntry(value, `spacing.${name}`);
    const px = remToPx(value);
    if (px && px !== value) addEntry(px, `spacing.${name}`);
  }
  for (const [name, value] of Object.entries(tokens.rounded)) {
    addEntry(value, `rounded.${name}`);
  }
  for (const [name, value] of Object.entries(tokens.sizes)) {
    addEntry(value, `sizes.${name}`);
    const px = remToPx(value);
    if (px && px !== value) addEntry(px, `sizes.${name}`);
  }
  for (const [name, entry] of Object.entries(tokens.typography.scale ?? {})) {
    if (entry.fontSize) addEntry(entry.fontSize, `typography.scale.${name}.fontSize`);
    if (entry.lineHeight) addEntry(entry.lineHeight, `typography.scale.${name}.lineHeight`);
    if (entry.letterSpacing) addEntry(entry.letterSpacing, `typography.scale.${name}.letterSpacing`);
  }

  return {
    tokens,
    /**
     * lookup(rawValue, { prefer? }) -> tokenPath | null
     *
     * When the same value lives in multiple namespaces (e.g., 8px exists as
     * `spacing.sm`, `rounded.lg`, and a typography line-height), the caller
     * passes `prefer` — a priority-ordered list of namespace prefixes — and
     * the first match in that ordering wins. Falls back to the first match
     * of any namespace.
     */
    lookup(value, options = {}) {
      if (value == null) return null;
      const hits = byValue.get(normalize(value));
      if (!hits || hits.length === 0) return null;
      const prefer = options.prefer ?? [];
      for (const prefix of prefer) {
        const hit = hits.find((t) => t.startsWith(prefix));
        if (hit) return hit;
      }
      return hits[0];
    },
    /** all(rawValue) -> tokenPath[]   (every match — useful for diagnostics) */
    all(value) {
      if (value == null) return [];
      return byValue.get(normalize(value)) ?? [];
    },
    has(value) {
      return byValue.has(normalize(value));
    },
    /** size of the index (sanity check during dev) */
    size() {
      return byValue.size;
    }
  };
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function hexToRgbString(hex) {
  const m = String(hex).match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff})`;
}

function remToPx(value) {
  const m = String(value).match(/^([\d.]+)rem$/);
  if (!m) return null;
  const px = Number(m[1]) * 16;
  // emit only when it lands on an integer px (the common case for the design tokens here)
  return Number.isInteger(px) ? `${px}px` : null;
}

// CLI sanity: `node scripts/token-index.mjs <value>` prints the matched token path(s).
if (import.meta.url === `file://${process.argv[1]}`) {
  const value = process.argv[2];
  loadTokenIndex().then((idx) => {
    if (!value) {
      console.log(`Token index built. Entries: ${idx.size()}.`);
      return;
    }
    const hits = idx.all(value);
    if (hits.length === 0) console.log(`No token matches for ${value}.`);
    else console.log(hits.join("\n"));
  });
}
