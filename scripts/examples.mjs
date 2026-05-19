import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

const EXAMPLES_ROOT = fromRoot("examples");

export async function examples(args) {
  const [command, name] = args;

  if (command === "list" || !command) {
    await listExamples();
    return;
  }

  if (command === "show") {
    if (!name) throw new Error("Usage: synapse-design-md examples show <name>");
    await showExample(name);
    return;
  }

  throw new Error(`Unknown examples command: ${command}`);
}

async function listExamples() {
  const files = await collectMarkdown(EXAMPLES_ROOT);
  for (const file of files) {
    console.log(path.relative(EXAMPLES_ROOT, file).replace(/\.md$/, ""));
  }
}

async function showExample(name) {
  const files = await collectMarkdown(EXAMPLES_ROOT);
  const normalized = name.replace(/\.md$/, "");
  const match = files.find((file) => path.relative(EXAMPLES_ROOT, file).replace(/\.md$/, "") === normalized);

  if (!match) throw new Error(`Example not found: ${name}`);
  console.log(await fs.readFile(match, "utf8"));
}

async function collectMarkdown(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await collectMarkdown(fullPath)));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }

  return files.sort();
}
