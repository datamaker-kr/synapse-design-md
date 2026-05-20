import { install, update } from "./install.mjs";
import { check } from "./check.mjs";
import { diff } from "./diff.mjs";
import { doctor } from "./doctor.mjs";
import { examples } from "./examples.mjs";
import { evalPage } from "./eval-page.mjs";
import { crawlSynapse } from "./crawl-synapse.mjs";
import { syncFromSource } from "./sync-from-source.mjs";
import { buildPagesInventory } from "./build-pages-inventory.mjs";
import { preview } from "./preview.mjs";
import { verifyContractCmd } from "./verify-contract.mjs";
import { crawlContract } from "./crawl-contract.mjs";
import { findingsToIssues } from "./findings-to-issues.mjs";

const HELP = `synapse-design-md

Usage:
  synapse-design-md install [--force]
  synapse-design-md update [--force]
  synapse-design-md check [--strict]
  synapse-design-md diff
  synapse-design-md doctor
  synapse-design-md eval [--target <url-or-file>]
  synapse-design-md crawl --login
  synapse-design-md crawl [--base-url <url>] [--category <name>] [--limit <n>] [--headed] [--out <dir>]
  synapse-design-md contract verify --contract <path[,path…]> --probe <path>
  synapse-design-md contract crawl --url <path> --selector <css> --component <name> [--out <dir>]
  synapse-design-md contract issues --findings <path> [--out <dir>] [--labels <a,b>]
  synapse-design-md sync [--source <path>] [--write]
  synapse-design-md inventory [--source <path>] [--write]
  synapse-design-md preview [--out preview.html]
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
    case "inventory":
      await buildPagesInventory({ ...parseFlags(rest), ...parseArgs(rest), write: rest.includes("--write") });
      return;
    case "preview":
      await preview(parseArgs(rest));
      return;
    case "examples":
      await examples(rest);
      return;
    case "contract": {
      const [sub, ...subRest] = rest;
      const subArgs = parseArgs(subRest);
      if (sub === "verify") {
        await verifyContractCmd(subArgs);
        return;
      }
      if (sub === "crawl") {
        await crawlContract(subArgs);
        return;
      }
      if (sub === "issues") {
        await findingsToIssues(subArgs);
        return;
      }
      throw new Error(`Unknown contract subcommand: ${sub}\n\n${HELP}`);
    }
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
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
