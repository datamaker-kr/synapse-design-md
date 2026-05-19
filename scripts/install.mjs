import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

const MANIFEST = ".synapse-design-md.json";
const DESIGN = "DESIGN.md";
const AGENTS = "AGENTS.md";
const BLOCK_START = "<!-- synapse-design-md:start";
const BLOCK_END = "<!-- synapse-design-md:end -->";

export async function install(options = {}) {
  await upsert({ ...options, mode: "install" });
}

export async function update(options = {}) {
  await upsert({ ...options, mode: "update" });
}

async function upsert(options) {
  const cwd = process.cwd();
  const packageJson = await readJson(fromRoot("package.json"));
  const version = packageJson.version;
  const designTemplate = await readText(fromRoot("templates", "DESIGN.md"));
  const agentsTemplate = await readText(fromRoot("templates", "AGENTS.block.md"));
  const designBlock = designTemplate.replaceAll("__PACKAGE_VERSION__", version);
  const agentsBlock = agentsTemplate.replaceAll("__PACKAGE_VERSION__", version).trim();

  await assertProjectRoot(cwd);

  const designResult = await writeDesignFile(cwd, designBlock, version, options.force);
  const agentsResult = await upsertAgentsBlock(cwd, agentsBlock, options.force);

  const manifest = {
    version,
    source: packageJson.name,
    designMdSha256: sha256(designBlock),
    agentsBlockVersion: version,
    installedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(cwd, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`${options.mode === "update" ? "Updated" : "Installed"} synapse-design-md ${version}`);
  console.log(`DESIGN.md: ${designResult}`);
  console.log(`AGENTS.md: ${agentsResult}`);
  console.log(`${MANIFEST}: written`);
}

async function assertProjectRoot(cwd) {
  try {
    await fs.access(path.join(cwd, ".git"));
    return;
  } catch {
    throw new Error(
      "Run this from a git repository root. Refusing to install repo policy files outside a git root."
    );
  }
}

async function writeDesignFile(cwd, nextContent, version, force) {
  const target = path.join(cwd, DESIGN);

  try {
    const existing = await readText(target);
    if (existing === nextContent) return "already current";

    const previousManifest = await readManifest(cwd);
    const existingHash = sha256(existing);
    if (force || previousManifest?.designMdSha256 === existingHash) {
      await fs.writeFile(target, nextContent);
      return force ? "replaced with --force" : "replaced managed file";
    }

    const newPath = path.join(cwd, `DESIGN.md.synapse-v${version}.new`);
    await fs.writeFile(newPath, nextContent);
    return `local changes detected; wrote ${path.basename(newPath)}`;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await fs.writeFile(target, nextContent);
    return "created";
  }
}

async function upsertAgentsBlock(cwd, nextBlock, force) {
  const target = path.join(cwd, AGENTS);
  const blockPattern = new RegExp(
    `${escapeRegExp(BLOCK_START)}[^\\n]*-->[\\s\\S]*?${escapeRegExp(BLOCK_END)}`,
    "g"
  );

  let existing = "";
  try {
    existing = await readText(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const matches = existing.match(blockPattern) || [];
  if (matches.length > 1 && !force) {
    throw new Error(
      "AGENTS.md contains multiple synapse-design-md managed blocks. Re-run with --force after reviewing duplicates."
    );
  }

  let next;
  if (matches.length > 0) {
    next = existing.replace(blockPattern, nextBlock);
  } else {
    const trimmed = existing.trimEnd();
    next = trimmed ? `${trimmed}\n\n${nextBlock}\n` : `${nextBlock}\n`;
  }

  if (next === existing) return "managed block already current";
  await fs.writeFile(target, next);
  return matches.length > 0 ? "managed block replaced" : "managed block inserted";
}

async function readManifest(cwd) {
  try {
    return await readJson(path.join(cwd, MANIFEST));
  } catch {
    return null;
  }
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

async function readText(file) {
  return fs.readFile(file, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
