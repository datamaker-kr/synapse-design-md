import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

const THEME_FILES = ["colors.js", "fonts.js", "screens.js", "shadows.js"];

const OWNED_BLOCKS = ["spacing", "sizes"];

const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px"
};

export async function syncFromSource(options = {}) {
  const sourceDir = path.resolve(
    process.cwd(),
    options.source || process.env.SYNAPSE_SOURCE || "../synapse-workspace"
  );

  await assertSource(sourceDir);

  const aliases = JSON.parse(
    await fs.readFile(fromRoot("scripts", "semantic-aliases.json"), "utf8")
  );
  assertGovernance(aliases);

  const blocks = {
    spacing: buildBlock("spacing", SPACING, { quote: true }),
    sizes: buildBlock("sizes", aliases.sizes || {}, { quote: false })
  };

  const targetTemplate = fromRoot("templates", "DESIGN.md");
  const existing = await fs.readFile(targetTemplate, "utf8");
  const next = replaceOwnedBlocks(existing, blocks);

  if (options.write) {
    if (existing === next) {
      console.log("templates/DESIGN.md already in sync (spacing + sizes match aliases).");
      return;
    }
    await fs.writeFile(targetTemplate, next);
    console.log("Wrote templates/DESIGN.md (spacing + sizes synced from semantic-aliases.json)");
    console.log("Run `node bin/synapse-design-md.js install --force` to refresh DESIGN.md in this repo.");
    return;
  }

  process.stdout.write(next);
  process.stderr.write(
    "\n(dry run — pass --write to update templates/DESIGN.md. Issue #3: sync owns spacing + sizes only; colors/typography/rounded/components are hand-edited.)\n"
  );
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

function assertGovernance(aliases) {
  if (aliases.components) {
    throw new Error(
      "semantic-aliases.json has a `components` key. Issue #3 (option C) makes `components` hand-edited in templates/DESIGN.md — remove the block from semantic-aliases.json or revisit the governance split."
    );
  }
  if (!aliases.sizes || typeof aliases.sizes !== "object") {
    throw new Error("semantic-aliases.json is missing the `sizes` object.");
  }
}

function buildBlock(name, entries, { quote }) {
  const lines = [`${name}:`];
  for (const [key, value] of Object.entries(entries)) {
    lines.push(`  ${key}: ${formatScalar(value, quote)}`);
  }
  return lines.join("\n");
}

function formatScalar(value, forceQuote) {
  if (typeof value !== "string") return String(value);
  if (forceQuote) return `"${value.replace(/"/g, '\\"')}"`;
  if (/^[\w.\-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function replaceOwnedBlocks(existing, blocks) {
  const fmMatch = existing.match(/^(---\n)([\s\S]*?)(\n---\n)/);
  if (!fmMatch) {
    throw new Error("templates/DESIGN.md has no YAML frontmatter — refusing to write.");
  }
  let body = fmMatch[2];
  for (const name of OWNED_BLOCKS) {
    body = replaceBlock(body, name, blocks[name]);
  }
  return existing.replace(fmMatch[0], `${fmMatch[1]}${body}${fmMatch[3]}`);
}

function replaceBlock(body, name, replacement) {
  const span = findBlockSpan(body, name);
  if (!span) {
    throw new Error(
      `templates/DESIGN.md frontmatter is missing the \`${name}:\` block. Sync refuses to invent it — add the block by hand first.`
    );
  }
  const lines = body.split("\n");
  lines.splice(span.start, span.end - span.start, ...replacement.split("\n"));
  return lines.join("\n");
}

function findBlockSpan(body, name) {
  const lines = body.split("\n");
  const header = `${name}:`;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (start === -1) {
      if (lines[i] === header || lines[i].startsWith(`${header} `)) {
        start = i;
      }
      continue;
    }
    if (lines[i] === "") continue;
    if (!/^\s/.test(lines[i])) {
      let end = i;
      while (end > start + 1 && lines[end - 1] === "") end--;
      return { start, end };
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  while (end > start + 1 && lines[end - 1] === "") end--;
  return { start, end };
}
