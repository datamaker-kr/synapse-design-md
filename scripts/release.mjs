#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, "../package.json");
const changelogPath = resolve(__dirname, "../CHANGELOG.md");

const bumpType = process.argv[2];
if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error("Usage: node release.mjs <patch|minor|major>");
  process.exit(1);
}

execFileSync("git", ["diff", "--quiet", "HEAD"], { stdio: "pipe" });
execFileSync("git", ["diff", "--quiet", "--cached"], { stdio: "pipe" });

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

let next;
if (bumpType === "patch") next = `${major}.${minor}.${patch + 1}`;
else if (bumpType === "minor") next = `${major}.${minor + 1}.0`;
else next = `${major + 1}.0.0`;

pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Bumped ${pkg.version} → ${next}`);

const commits = execFileSync(
  "git", ["log", `v${pkg.version}..HEAD`, "--format=- %s"],
  { encoding: "utf8" }
).trim();

const today = new Date().toISOString().slice(0, 10);
const entry = `\n## [${next}] - ${today}\n\n### Changed\n${commits}\n`;

const changelog = readFileSync(changelogPath, "utf8");
const headerEnd = changelog.indexOf("\n## [");
writeFileSync(
  changelogPath,
  changelog.slice(0, headerEnd) + entry + changelog.slice(headerEnd)
);
console.log(`Updated CHANGELOG.md with ${next} entry`);
