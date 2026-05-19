import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

export async function evalPage(options = {}) {
  const thresholds = JSON.parse(await fs.readFile(fromRoot("eval", "thresholds.json"), "utf8"));
  const target = options.target || "(not provided)";
  const sizeTokenValues = await loadSizeTokens();
  const tailwindLookup = await loadTailwindLookup();
  const staticScan = options.target
    ? await scanTarget(path.resolve(process.cwd(), options.target), { sizeTokenValues, tailwindLookup })
    : null;

  const report = {
    target,
    status: staticScan ? "static-scan-complete-manual-render-evidence-required" : "manual-evidence-required",
    thresholds,
    staticScan,
    requiredEvidence: [
      "DESIGN.md lint output",
      "static token/code scan output",
      "desktop screenshot",
      "mobile screenshot",
      "accessibility or contrast evidence",
      "notes for deliberate deviations"
    ],
    scoreCategories: [
      "color",
      "typography",
      "spacing",
      "components",
      "interactionStates",
      "responsive",
      "accessibility",
      "productTone"
    ]
  };

  console.log(JSON.stringify(report, null, 2));
}

async function scanTarget(target, { sizeTokenValues, tailwindLookup } = {}) {
  const files = await collectFiles(target);
  const findings = [];

  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      addMatches(findings, file, index + 1, line, /#[0-9a-fA-F]{3,8}\b/g, "raw-hex-color");
      addMatches(
        findings,
        file,
        index + 1,
        line,
        /\b(?:text|bg|border|rounded|p[trblxy]?|m[trblxy]?|gap|w|h|min-w|max-w|min-h|max-h)-\[[^\]]+\]/g,
        "tailwind-arbitrary-value"
      );
      addMatches(
        findings,
        file,
        index + 1,
        line,
        /\bfontSize\s*[:=]\s*["'`]?\d+(?:\.\d+)?(?:px|rem|em)\b/g,
        "arbitrary-font-size"
      );
    });
  }

  for (const f of findings) {
    if (f.type !== "tailwind-arbitrary-value") continue;
    const inner = f.match.match(/\[(.+)\]$/)?.[1];
    if (!inner) continue;
    if (sizeTokenValues && sizeTokenValues.has(inner)) f.tokenBacked = true;
    if (tailwindLookup) {
      const prefix = f.match.match(/^([a-z-]+)-\[/)?.[1];
      const cls = tailwindLookup.suggest(prefix, inner);
      if (cls) {
        f.type = "redundant-arbitrary-value";
        f.suggested = cls;
        f.tokenBacked = false;
      }
    }
  }

  return {
    filesScanned: files.length,
    findingCount: findings.length,
    summary: summarize(findings),
    findings: findings.slice(0, 100)
  };
}

async function loadSizeTokens() {
  try {
    const aliases = JSON.parse(await fs.readFile(fromRoot("scripts", "semantic-aliases.json"), "utf8"));
    const out = new Set();
    for (const value of Object.values(aliases.sizes || {})) {
      out.add(value);
      const px = toPx(value);
      if (px) out.add(px);
      const rem = toRem(value);
      if (rem) out.add(rem);
    }
    return out;
  } catch {
    return new Set();
  }
}

function toPx(value) {
  const m = String(value).match(/^(-?\d*\.?\d+)rem$/);
  if (!m) return null;
  const px = Number(m[1]) * 16;
  if (!Number.isInteger(px)) return null;
  return `${px}px`;
}

function toRem(value) {
  const m = String(value).match(/^(-?\d+)px$/);
  if (!m) return null;
  return `${Number(m[1]) / 16}rem`;
}

async function loadTailwindLookup() {
  try {
    const data = JSON.parse(
      await fs.readFile(fromRoot("scripts", "tailwind-default-scale.json"), "utf8")
    );
    const spacing = data.spacing || {};
    const valueToKey = new Map();
    for (const [key, value] of Object.entries(spacing)) {
      valueToKey.set(value, key);
    }
    const sizingPrefixes = new Set([
      "w", "h", "min-w", "min-h", "max-w", "max-h",
      "p", "pt", "pr", "pb", "pl", "px", "py",
      "m", "mt", "mr", "mb", "ml", "mx", "my",
      "gap", "gap-x", "gap-y"
    ]);
    return {
      suggest(prefix, value) {
        if (!prefix || !sizingPrefixes.has(prefix)) return null;
        const key = valueToKey.get(value);
        return key ? `${prefix}-${key}` : null;
      }
    };
  } catch {
    return null;
  }
}

function summarize(findings) {
  const byType = {};
  const byTailwindPrefix = {};
  const byFile = new Map();
  const matchCounts = new Map();
  const unbackedMatchCounts = new Map();
  const redundantSuggestionCounts = new Map();
  let tokenBackedCount = 0;

  for (const f of findings) {
    byType[f.type] = (byType[f.type] || 0) + 1;
    byFile.set(f.file, (byFile.get(f.file) || 0) + 1);
    if (f.tokenBacked) tokenBackedCount += 1;

    if (f.type === "tailwind-arbitrary-value") {
      const prefix = f.match.match(/^([a-z-]+)-\[/)?.[1] || "unknown";
      byTailwindPrefix[prefix] = (byTailwindPrefix[prefix] || 0) + 1;
      const key = `${prefix}\t${f.match}`;
      matchCounts.set(key, (matchCounts.get(key) || 0) + 1);
      if (!f.tokenBacked) {
        unbackedMatchCounts.set(key, (unbackedMatchCounts.get(key) || 0) + 1);
      }
    } else if (f.type === "redundant-arbitrary-value" && f.suggested) {
      const key = `${f.match}\t${f.suggested}`;
      redundantSuggestionCounts.set(key, (redundantSuggestionCounts.get(key) || 0) + 1);
    }
  }

  const topFiles = [...byFile.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  const topMatchesByPrefix = {};
  for (const [key, count] of matchCounts.entries()) {
    if (count < 2) continue;
    const [prefix, match] = key.split("\t");
    (topMatchesByPrefix[prefix] ??= []).push({ match, count });
  }
  for (const prefix of Object.keys(topMatchesByPrefix)) {
    topMatchesByPrefix[prefix].sort((a, b) => b.count - a.count);
  }

  const unbackedMatchesByPrefix = {};
  for (const [key, count] of unbackedMatchCounts.entries()) {
    if (count < 2) continue;
    const [prefix, match] = key.split("\t");
    (unbackedMatchesByPrefix[prefix] ??= []).push({ match, count });
  }
  for (const prefix of Object.keys(unbackedMatchesByPrefix)) {
    unbackedMatchesByPrefix[prefix].sort((a, b) => b.count - a.count);
  }

  const topRedundantSuggestions = [...redundantSuggestionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([key, count]) => {
      const [match, suggested] = key.split("\t");
      return { match, suggested, count };
    });

  return {
    byType,
    byTailwindPrefix,
    tokenBackedCount,
    unbackedCount: findings.length - tokenBackedCount,
    topFiles,
    topMatchesByPrefix,
    unbackedMatchesByPrefix,
    topRedundantSuggestions
  };
}

async function collectFiles(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) return shouldScan(target) ? [target] : [];

  const entries = await fs.readdir(target, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(fullPath)));
    if (entry.isFile() && shouldScan(fullPath)) files.push(fullPath);
  }
  return files;
}

function shouldScan(file) {
  return /\.(css|html|jsx|tsx|js|ts|md|svelte|vue)$/.test(file);
}

function addMatches(findings, file, lineNumber, line, pattern, type) {
  for (const match of line.matchAll(pattern)) {
    findings.push({
      type,
      file: path.relative(process.cwd(), file),
      line: lineNumber,
      match: match[0]
    });
  }
}
