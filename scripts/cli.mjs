import { install, update } from "./install.mjs";
import { check } from "./check.mjs";
import { diff } from "./diff.mjs";
import { doctor } from "./doctor.mjs";
import { examples } from "./examples.mjs";
import { evalPage } from "./eval-page.mjs";
import { crawlSynapse } from "./crawl-synapse.mjs";
import { syncFromSource } from "./sync-from-source.mjs";

const HELP = `synapse-design-md

Usage:
  synapse-design-md install [--force]
  synapse-design-md update [--force]
  synapse-design-md check [--strict]
  synapse-design-md diff
  synapse-design-md doctor
  synapse-design-md eval [--target <url-or-file>]
  synapse-design-md crawl [--out evidence/crawl-runs]
  synapse-design-md sync [--source <path>] [--write]
  synapse-design-md examples list
  synapse-design-md examples show <name>

Install footprint:
  DESIGN.md
  AGENTS.md managed marker block
  .synapse-design-md.json`;

export async function main(argv) {
  const [command, ...rest] = argv;

  switch (command) {
    case "install":
      await install(parseFlags(rest));
      return;
    case "update":
      await update(parseFlags(rest));
      return;
    case "check":
      await check(parseFlags(rest));
      return;
    case "diff":
      await diff(parseFlags(rest));
      return;
    case "doctor":
      await doctor(parseFlags(rest));
      return;
    case "eval":
      await evalPage(parseArgs(rest));
      return;
    case "crawl":
      await crawlSynapse(parseArgs(rest));
      return;
    case "sync":
      await syncFromSource({ ...parseFlags(rest), ...parseArgs(rest), write: rest.includes("--write") });
      return;
    case "examples":
      await examples(rest);
      return;
    case "-h":
    case "--help":
    case undefined:
      console.log(HELP);
      return;
    default:
      throw new Error(`Unknown command: ${command}\n\n${HELP}`);
  }
}

function parseFlags(args) {
  return {
    force: args.includes("--force"),
    strict: args.includes("--strict")
  };
}

function parseArgs(args) {
  const parsed = parseFlags(args);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith("--") && args[index + 1] && !args[index + 1].startsWith("--")) {
      parsed[args[index].slice(2)] = args[index + 1];
      index += 1;
    }
  }
  return parsed;
}
