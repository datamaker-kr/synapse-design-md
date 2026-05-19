import fs from "node:fs/promises";
import path from "node:path";

export async function crawlSynapse(options = {}) {
  const outDir = path.resolve(process.cwd(), options.out || "evidence/crawl-runs");
  await fs.mkdir(outDir, { recursive: true });

  const manifest = {
    status: "not-started",
    reason: "Authenticated Synapse crawling requires a Playwright storage state supplied outside git.",
    nextSteps: [
      "Add Playwright as a dev dependency when browser capture starts.",
      "Store auth state outside the repository or under an ignored auth path.",
      "Write only anonymized page inventory and curated golden screenshots to version control."
    ],
    createdAt: new Date().toISOString()
  };

  const file = path.join(outDir, `crawl-plan-${timestamp()}.json`);
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote crawl scaffold: ${path.relative(process.cwd(), file)}`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
