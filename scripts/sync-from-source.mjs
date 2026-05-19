import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fromRoot } from "./paths.mjs";

const THEME_FILES = ["colors.js", "fonts.js", "screens.js", "shadows.js"];

export async function syncFromSource(options = {}) {
  const sourceDir = path.resolve(
    process.cwd(),
    options.source || process.env.SYNAPSE_SOURCE || "../synapse-workspace"
  );

  await assertSource(sourceDir);

  const aliases = JSON.parse(await fs.readFile(fromRoot("scripts", "semantic-aliases.json"), "utf8"));
  const theme = await loadTheme(sourceDir);
  const yaml = buildFrontmatter({ theme, aliases });

  const targetTemplate = fromRoot("templates", "DESIGN.md");
  const existing = await fs.readFile(targetTemplate, "utf8");
  const next = replaceFrontmatter(existing, yaml);

  if (options.write) {
    if (existing === next) {
      console.log("templates/DESIGN.md already in sync.");
      return;
    }
    await fs.writeFile(targetTemplate, next);
    console.log(`Wrote templates/DESIGN.md (from ${path.relative(process.cwd(), sourceDir)})`);
    console.log("Run `node bin/synapse-design-md.js install --force` to refresh DESIGN.md in this repo.");
    return;
  }

  process.stdout.write(next);
  process.stderr.write("\n(dry run — pass --write to update templates/DESIGN.md)\n");
}

async function assertSource(dir) {
  for (const file of THEME_FILES) {
    const probe = path.join(dir, "lib/tailwind/theme", file);
    try {
      await fs.access(probe);
    } catch {
      throw new Error(
        `Synapse source missing ${file} at ${dir}. Set SYNAPSE_SOURCE or pass --source <path>.`
      );
    }
  }
}

async function loadTheme(sourceDir) {
  const themeDir = path.join(sourceDir, "lib/tailwind/theme");
  const stamp = `${process.pid}-${Date.now()}`;

  const fontsRaw = await fs.readFile(path.join(themeDir, "fonts.js"), "utf8");
  const fontsShimName = `.synapse-fonts-shim-${stamp}.mjs`;
  const fontsShimPath = path.join(themeDir, fontsShimName);
  await fs.writeFile(
    fontsShimPath,
    fontsRaw.replace(/from\s+['"]tailwindcss\/defaultTheme['"]/g, "from 'tailwindcss/defaultTheme.js'")
  );

  const tmpName = `.synapse-theme-probe-${stamp}.mjs`;
  const tmp = path.join(sourceDir, tmpName);
  const probe = [
    "import colors from './lib/tailwind/theme/colors.js'",
    `import fonts from './lib/tailwind/theme/${fontsShimName}'`,
    "import screens from './lib/tailwind/theme/screens.js'",
    "import shadows from './lib/tailwind/theme/shadows.js'",
    "process.stdout.write(JSON.stringify({ colors, fonts, screens, shadows }))",
    ""
  ].join("\n");

  await fs.writeFile(tmp, probe);
  try {
    const result = spawnSync("node", [tmpName], { cwd: sourceDir, encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(`Theme probe failed (exit ${result.status}):\n${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout);
  } finally {
    await fs.unlink(tmp).catch(() => {});
    await fs.unlink(fontsShimPath).catch(() => {});
  }
}

function buildFrontmatter({ theme, aliases }) {
  const colors = resolveColors(theme.colors, aliases.colors);
  const typography = resolveTypography(theme.fonts.fontSize, aliases.typography, aliases.fontFamily);
  const components = resolveComponents(theme.colors, aliases);

  const lines = [];
  lines.push("---");
  lines.push("version: beta");
  lines.push("name: Synapse");
  lines.push(
    "description: Synapse product design contract synced from synapse-workspace tailwind theme."
  );
  lines.push("x-synapse-design-md:");
  lines.push("  packageVersion: __PACKAGE_VERSION__");
  lines.push("  source: synapse-design-md");
  lines.push("  syncedFrom: synapse-workspace/lib/tailwind/theme");
  lines.push("");
  lines.push("colors:");
  for (const [key, value] of Object.entries(colors)) {
    lines.push(`  ${key}: "${value}"`);
  }
  lines.push("");
  lines.push("typography:");
  for (const [key, value] of Object.entries(typography)) {
    lines.push(`  ${key}:`);
    lines.push(`    fontFamily: ${quoteIfNeeded(value.fontFamily)}`);
    lines.push(`    fontSize: ${value.fontSize}`);
    lines.push(`    lineHeight: ${value.lineHeight}`);
    if (value.letterSpacing) lines.push(`    letterSpacing: ${value.letterSpacing}`);
  }
  lines.push("");
  lines.push("spacing:");
  for (const [key, value] of Object.entries({
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px"
  })) {
    lines.push(`  ${key}: ${value}`);
  }
  lines.push("");
  lines.push("rounded:");
  for (const [key, value] of Object.entries({ sm: "4px", md: "6px", lg: "8px", xl: "12px" })) {
    lines.push(`  ${key}: ${value}`);
  }
  if (aliases.sizes) {
    lines.push("");
    lines.push("sizes:");
    for (const [key, value] of Object.entries(aliases.sizes)) {
      lines.push(`  ${key}: ${quoteIfNeeded(value)}`);
    }
  }
  lines.push("");
  lines.push("components:");
  for (const [name, props] of Object.entries(components)) {
    lines.push(`  ${name}:`);
    for (const [key, value] of Object.entries(props)) {
      lines.push(`    ${key}: ${quoteIfNeeded(value)}`);
    }
  }
  lines.push("---");

  return lines.join("\n");
}

function resolveColors(palette, mapping) {
  const out = {};
  for (const [slot, ref] of Object.entries(mapping)) {
    out[slot] = lookupPalette(palette, ref);
  }
  return out;
}

function resolveTypography(fontSize, mapping, fontFamily) {
  const out = {};
  for (const [slot, scale] of Object.entries(mapping)) {
    const entry = fontSize[scale];
    if (!entry) throw new Error(`Unknown fontSize scale '${scale}' for slot '${slot}'`);
    const [size, meta = {}] = entry;
    out[slot] = {
      fontFamily,
      fontSize: remToPx(size),
      lineHeight: meta.lineHeight ? remToPx(meta.lineHeight) : "1.5",
      letterSpacing: meta.letterSpacing || null
    };
  }
  return out;
}

function resolveComponents(palette, aliases) {
  const tokenize = (value) => {
    if (typeof value !== "string") return value;
    if (value.startsWith("{")) return value;
    if (!/^[a-z]+\.\d+$/.test(value)) return value;
    return lookupPalette(palette, value);
  };
  const out = {};
  for (const [name, props] of Object.entries(aliases.components)) {
    const entry = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === "source") continue;
      entry[key] = tokenize(value);
    }
    out[name] = entry;
  }
  return out;
}

function lookupPalette(palette, ref) {
  const [name, shade] = ref.split(".");
  const value = palette?.[name]?.[shade];
  if (!value) throw new Error(`Palette ref '${ref}' not found in source theme`);
  return normalizeColor(value);
}

function normalizeColor(value) {
  if (typeof value !== "string") return value;
  const opaque = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*1(?:\.0+)?\s*)?\)$/);
  if (!opaque) return value;
  const [, r, g, b] = opaque;
  return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, "0").toUpperCase()).join("")}`;
}

function remToPx(value) {
  if (typeof value !== "string") return String(value);
  const match = value.match(/^(-?\d*\.?\d+)rem$/);
  if (!match) return value;
  return `${Math.round(Number(match[1]) * 16)}px`;
}

function quoteIfNeeded(value) {
  if (typeof value !== "string") return String(value);
  if (/^[\w.\-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function replaceFrontmatter(existing, nextYaml) {
  const match = existing.match(/^---\n[\s\S]*?\n---/);
  if (!match) return `${nextYaml}\n\n${existing.trimStart()}`;
  return existing.replace(match[0], nextYaml);
}
