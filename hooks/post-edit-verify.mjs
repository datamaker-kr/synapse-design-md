#!/usr/bin/env node
/**
 * PostToolUse hook: verify contracts touched by the last Edit/Write.
 *
 * Wire it in `.claude/settings.json`:
 *   {
 *     "hooks": {
 *       "PostToolUse": [
 *         {
 *           "matcher": "Edit|Write",
 *           "hooks": [{ "type": "command",
 *             "command": "node ${CLAUDE_PROJECT_DIR}/node_modules/synapse-design-md/hooks/post-edit-verify.mjs" }]
 *         }
 *       ]
 *     }
 *   }
 *
 * The hook reads the tool-use event from stdin (Claude Code passes it as JSON),
 * resolves which contract(s) to run, invokes the verifier, and writes a short
 * report to stderr so the editor surfaces it inline. Exits 0 unless a
 * descriptive contract fails — never blocks on aspirational warnings.
 *
 * Resolution rules (best-effort, conservative):
 *   1. If the edited file path matches a `consumerFor` map in
 *      `.synapse-design-md.json`, verify against the mapped contract(s).
 *   2. Otherwise, no-op silently (the hook stays cheap when off-target).
 *
 * Mapping config (.synapse-design-md.json):
 *   {
 *     "contracts": {
 *       "consumerFor": {
 *         "src/components/Header*.{tsx,vue}":
 *             ["examples/molecules/nav-item.contract.descriptive.json",
 *              "examples/molecules/nav-item.contract.aspirational.json"],
 *         "src/components/Button*.{tsx,vue}":
 *             ["examples/atoms/button-primary.contract.descriptive.json"]
 *       },
 *       "probeFrom": "evidence/contracts/{name}/latest.probe.json"
 *     }
 *   }
 *
 * The hook does NOT crawl on its own — running Playwright in a PostToolUse
 * hook would be too slow for a per-edit loop. Probes must be captured ahead
 * of time (e.g., via a Stop hook or a manual `contract crawl`) and the hook
 * verifies the most recent probe against the touched contracts.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
// The hook ships inside the synapse-design-md package; the CLI is two levels up.
const packageBin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "bin", "synapse-design-md.js");

main().catch((err) => {
  // Hooks must not crash Claude Code. Log to stderr and exit 0.
  process.stderr.write(`[synapse-design-md hook] ${err.message}\n`);
  process.exit(0);
});

async function main() {
  const event = await readStdinJson();
  if (!event) return;

  const editedPath = event.tool_input?.file_path || event.tool_input?.path;
  if (!editedPath) return;

  const cfg = await readConfig();
  if (!cfg?.contracts?.consumerFor) return;

  const matchedContracts = resolveContracts(editedPath, cfg.contracts.consumerFor);
  if (matchedContracts.length === 0) return;

  const probePath = await resolveProbe(matchedContracts[0], cfg.contracts.probeFrom);
  if (!probePath) {
    process.stderr.write(
      `[synapse-design-md] no probe for ${path.basename(matchedContracts[0])}. ` +
      `Run \`synapse-design-md contract crawl …\` first.\n`
    );
    return;
  }

  // Prefer the .bin shim (if installed via npm), otherwise the package's own bin.
  const linkedBin = path.join(projectDir, "node_modules/.bin/synapse-design-md");
  const cli = (await exists(linkedBin)) ? linkedBin : packageBin;
  const args = ["contract", "verify", "--contract", matchedContracts.join(","), "--probe", probePath];

  const result = cli === linkedBin
    ? spawnSync(cli, args, { cwd: projectDir, encoding: "utf8" })
    : spawnSync(process.execPath, [cli, ...args], { cwd: projectDir, encoding: "utf8" });

  // Forward verifier output to stderr so it shows up in the editor's hook UI.
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  // Block only on descriptive failures; aspirational warnings exit 0 from the verifier.
  process.exit(result.status === 0 ? 0 : 2);
}

async function readStdinJson() {
  if (process.stdin.isTTY) return null;
  let buf = "";
  for await (const chunk of process.stdin) buf += chunk;
  if (!buf.trim()) return null;
  try { return JSON.parse(buf); } catch { return null; }
}

async function readConfig() {
  for (const name of [".synapse-design-md.json", ".synapse-design-md.local.json"]) {
    const p = path.join(projectDir, name);
    if (await exists(p)) {
      try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { /* ignore */ }
    }
  }
  return null;
}

function resolveContracts(filePath, consumerFor) {
  const rel = path.relative(projectDir, filePath);
  const matches = [];
  for (const [glob, contracts] of Object.entries(consumerFor)) {
    if (matchesGlob(rel, glob)) {
      matches.push(...(Array.isArray(contracts) ? contracts : [contracts]));
    }
  }
  return matches.map((c) => path.resolve(projectDir, c));
}

function matchesGlob(rel, glob) {
  // Tiny glob: ** = any, * = any-non-slash, {a,b} = alternation.
  const re = new RegExp(
    "^" +
    glob
      .replace(/[.+^$()|]/g, "\\$&")
      .replace(/\{([^}]+)\}/g, (_, body) => `(?:${body.split(",").join("|")})`)
      .replace(/\*\*/g, "::doublestar::")
      .replace(/\*/g, "[^/]*")
      .replace(/::doublestar::/g, ".*")
    + "$"
  );
  return re.test(rel);
}

async function resolveProbe(contractPath, template) {
  if (!template) return null;
  const name = path.basename(contractPath).replace(/\.contract\.(descriptive|aspirational)\.json$/, "");
  // Strip the filename portion of the template (the hook always grabs the
  // latest .probe.json, not a literal "latest.probe.json" file).
  const dirTemplate = template.replace(/\/[^/]*$/, "");
  const probeDir = path.resolve(projectDir, dirTemplate.replace("{name}", name));
  if (!(await exists(probeDir))) return null;
  const files = (await fs.readdir(probeDir)).filter((f) => f.endsWith(".probe.json")).sort();
  if (files.length === 0) return null;
  return path.join(probeDir, files[files.length - 1]);
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
