import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export async function doctor() {
  const cwd = process.cwd();
  const rows = [];

  rows.push(["cwd", cwd]);
  rows.push(["git root", (await exists(path.join(cwd, ".git"))) ? "yes" : "no"]);
  rows.push(["DESIGN.md", (await exists(path.join(cwd, "DESIGN.md"))) ? "present" : "missing"]);
  rows.push(["AGENTS.md", (await exists(path.join(cwd, "AGENTS.md"))) ? "present" : "missing"]);
  rows.push([
    ".synapse-design-md.json",
    (await exists(path.join(cwd, ".synapse-design-md.json"))) ? "present" : "missing"
  ]);
  rows.push(["node", process.version]);
  rows.push(["npx", commandVersion("npx")]);

  const width = Math.max(...rows.map(([key]) => key.length));
  for (const [key, value] of rows) {
    console.log(`${key.padEnd(width)}  ${value}`);
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function commandVersion(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (result.error) return "missing";
  return (result.stdout || result.stderr || "unknown").trim();
}
