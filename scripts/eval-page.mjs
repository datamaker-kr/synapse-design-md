import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

export async function evalPage(options = {}) {
  const thresholds = JSON.parse(await fs.readFile(fromRoot("eval", "thresholds.json"), "utf8"));
  const target = options.target || "(not provided)";
  const sizeTokenValues = await loadSizeTokens();
  const staticScan = options.target
    ? await scanTarget(path.resolve(process.cwd(), options.target), { sizeTokenValues })
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

async function scanTarget(target, { sizeTokenValues } = {}) {
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

  if (sizeTokenValues) {
    for (const f of findings) {
      if (f.type !== "tailwind-arbitrary-value") continue;
      const inner = f.match.match(/\[(.+)\]$/)?.[1];
      if (inner && sizeTokenValues.has(inner)) f.tokenBacked = true;
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
    return new Set(Object.values(aliases.sizes || {}));
  } catch {
    return new Set();
  }
}

function summarize(findings) {
  const byType = {};
  const byTailwindPrefix = {};
  const byFile = new Map();
  const matchCounts = new Map();
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

  return {
    byType,
    byTailwindPrefix,
    tokenBackedCount,
    unbackedCount: findings.length - tokenBackedCount,
    topFiles,
    topMatchesByPrefix
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
