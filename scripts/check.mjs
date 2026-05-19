import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_FILES = ["DESIGN.md", "AGENTS.md", ".synapse-design-md.json"];
const BLOCK_START = "<!-- synapse-design-md:start";
const BLOCK_END = "<!-- synapse-design-md:end -->";

export async function check(options = {}) {
  const cwd = process.cwd();
  const failures = [];

  for (const file of REQUIRED_FILES) {
    if (!(await exists(path.join(cwd, file)))) {
      failures.push(`Missing ${file}`);
    }
  }

  const agents = await readOptional(path.join(cwd, "AGENTS.md"));
  if (agents) {
    const blockCount = countManagedBlocks(agents);
    if (blockCount !== 1) {
      failures.push(`AGENTS.md must contain exactly one managed block; found ${blockCount}`);
    }
  }

  const design = await readOptional(path.join(cwd, "DESIGN.md"));
  if (design) {
    if (!design.includes("x-synapse-design-md:")) {
      failures.push("DESIGN.md is missing x-synapse-design-md metadata");
    }
    if (!design.includes("## Overview")) {
      failures.push("DESIGN.md is missing ## Overview");
    }
  }

  const lintResult = runGoogleDesignLint(cwd);
  if (lintResult.status === "failed") {
    failures.push(lintResult.message);
  } else if (lintResult.status === "skipped") {
    console.log(`Skipped Google DESIGN.md lint: ${lintResult.message}`);
  } else {
    console.log("Google DESIGN.md lint passed");
  }

  if (failures.length > 0) {
    console.error("synapse-design-md check failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  if (options.strict && lintResult.status !== "passed") {
    console.error("synapse-design-md strict check failed: Google DESIGN.md lint did not pass.");
    process.exitCode = 1;
    return;
  }

  console.log("synapse-design-md check passed");
}

function runGoogleDesignLint(cwd) {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["--yes", "@google/design.md", "lint", "DESIGN.md"],
    { cwd, encoding: "utf8" }
  );

  if (result.error?.code === "ENOENT") {
    return { status: "skipped", message: "npx is not available" };
  }
  if (result.status === 0) return { status: "passed" };

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return {
    status: "failed",
    message: `Google DESIGN.md lint failed${output ? `: ${output}` : ""}`
  };
}

function countManagedBlocks(value) {
  const re = new RegExp(
    `${escapeRegExp(BLOCK_START)}[^\\n]*-->[\\s\\S]*?${escapeRegExp(BLOCK_END)}`,
    "g"
  );
  return (value.match(re) || []).length;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return "";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
