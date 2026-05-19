import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

export async function evalPage(options = {}) {
  const thresholds = JSON.parse(await fs.readFile(fromRoot("eval", "thresholds.json"), "utf8"));
  const target = options.target || "(not provided)";
  const staticScan = options.target ? await scanTarget(path.resolve(process.cwd(), options.target)) : null;

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

async function scanTarget(target) {
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

  return {
    filesScanned: files.length,
    findingCount: findings.length,
    findings: findings.slice(0, 100)
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
