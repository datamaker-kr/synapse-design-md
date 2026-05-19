import { spawnSync } from "node:child_process";

export async function diff() {
  const result = spawnSync("git", ["diff", "--", "DESIGN.md", "AGENTS.md", ".synapse-design-md.json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.error) throw result.error;
  if (result.stdout.trim()) {
    console.log(result.stdout.trimEnd());
    return;
  }
  console.log("No DESIGN.md, AGENTS.md, or manifest diff.");
}
