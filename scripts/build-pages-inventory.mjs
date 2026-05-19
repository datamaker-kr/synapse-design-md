import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

const IGNORED_FILENAMES = new Set(["types.d.ts"]);

export async function buildPagesInventory(options = {}) {
  const sourceDir = path.resolve(
    process.cwd(),
    options.source || process.env.SYNAPSE_SOURCE || "../synapse-workspace"
  );
  const pagesDir = path.join(sourceDir, "pages");
  await assertPagesDir(pagesDir);

  const files = await collectPageFiles(pagesDir);
  const entries = await Promise.all(files.map((file) => buildEntry(file, pagesDir)));
  entries.sort((a, b) => a.route.localeCompare(b.route));

  const grouped = groupEntries(entries);
  const inventory = {
    generatedAt: new Date().toISOString(),
    source: path.relative(process.cwd(), pagesDir),
    totals: {
      files: entries.length,
      byCategory: Object.fromEntries(
        Object.entries(grouped).map(([cat, list]) => [cat, list.length])
      )
    },
    routes: grouped
  };

  const targetPath = fromRoot("scripts", "synapse-pages.json");
  const output = `${JSON.stringify(inventory, null, 2)}\n`;

  if (options.write) {
    await fs.writeFile(targetPath, output);
    console.log(`Wrote ${path.relative(process.cwd(), targetPath)}`);
    console.log(`  ${entries.length} routes across ${Object.keys(grouped).length} categories`);
    return;
  }

  process.stdout.write(output);
  process.stderr.write(`\n(dry run — pass --write to update scripts/synapse-pages.json)\n`);
}

async function assertPagesDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    throw new Error(`Synapse pages dir not found at ${dir}. Set SYNAPSE_SOURCE or pass --source.`);
  }
}

async function collectPageFiles(root) {
  const out = [];
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_FILENAMES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".vue")) {
        out.push(full);
      }
    }
  };
  await walk(root);
  return out;
}

async function buildEntry(filePath, pagesRoot) {
  const rel = path.relative(pagesRoot, filePath).replace(/\\/g, "/");
  const route = fileToRoute(rel);
  const params = [...route.matchAll(/:([a-zA-Z_]+)/g)].map((m) => m[1]);
  const meta = await readPageMeta(filePath);
  const category = classify(route, meta);

  return {
    route,
    file: `pages/${rel}`,
    category,
    params,
    skipAuth: meta.skipAuth === true,
    layout: meta.layout ?? null,
    clientOnly: rel.endsWith(".client.vue")
  };
}

function fileToRoute(rel) {
  let route = rel.replace(/\.client\.vue$|\.vue$/, "");
  route = route.replace(/\[([^\]]+)\]/g, ":$1");
  if (route.endsWith("/index")) route = route.slice(0, -"/index".length);
  if (route === "index") route = "";
  return `/${route}`.replace(/\/+$/g, "") || "/";
}

async function readPageMeta(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const match = text.match(/definePageMeta\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return {};
  const body = match[1];
  return {
    skipAuth: /\bskipAuth\s*:\s*true\b/.test(body) ? true : undefined,
    layout: extractStringLiteral(body, "layout")
  };
}

function extractStringLiteral(body, key) {
  const m = body.match(new RegExp(`\\b${key}\\s*:\\s*(['\"])([^'\"]*)\\1`));
  if (m) return m[2];
  const falsy = body.match(new RegExp(`\\b${key}\\s*:\\s*(false|null)\\b`));
  if (falsy) return falsy[1] === "false" ? false : null;
  return undefined;
}

function classify(route, meta) {
  if (meta.skipAuth === true) return "auth-public";
  if (route === "/request-permission" || route === "/token-login") return "auth-public";
  if (route.startsWith("/auth/")) return "auth-public";

  if (/\/(settings|account)(\/|$)/.test(route)) return "settings";
  if (/\/(create|modify)(?:-[\w-]+)?$/.test(route)) return "form";
  if (/\/learning-create$/.test(route)) return "form";
  if (/\/(statistics|dashboard)(\/|$)/.test(route)) return "dashboard";

  if (route === "/") return "index";
  if (!route.includes(":")) return "index";
  if (/\/:[^/]+$/.test(route)) return "detail";

  return "workspace";
}

function groupEntries(entries) {
  const order = ["auth-public", "index", "detail", "settings", "form", "dashboard", "workspace"];
  const groups = Object.fromEntries(order.map((k) => [k, []]));
  for (const e of entries) {
    (groups[e.category] ??= []).push(e);
  }
  for (const k of Object.keys(groups)) {
    if (groups[k].length === 0) delete groups[k];
  }
  return groups;
}
