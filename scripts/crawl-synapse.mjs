import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

const DEFAULT_BASE_URL = "https://test.synapse.sh";
const STORAGE_PATH = "auth/storage-state.json";
const LOGIN_PATH = "/auth/login";
const POST_LOGIN_TIMEOUT_MS = 20_000;

export async function crawlSynapse(options = {}) {
  const baseUrl = (options["base-url"] || process.env.SYNAPSE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const storagePath = path.resolve(process.cwd(), STORAGE_PATH);
  const outRoot = path.resolve(process.cwd(), options.out || "evidence/crawl-runs");

  if (options.login) {
    await loginAndSaveStorage({ baseUrl, storagePath });
    return;
  }

  await assertStorage(storagePath);

  const inventory = JSON.parse(
    await fs.readFile(fromRoot("scripts", "synapse-pages.json"), "utf8")
  );
  const routes = selectRoutes(inventory, options);
  if (routes.length === 0) {
    console.log("No routes matched the selection — nothing to crawl.");
    return;
  }

  const runDir = path.join(outRoot, runTimestamp());
  const shotsDir = path.join(runDir, "screenshots");
  const logsDir = path.join(runDir, "logs");
  await fs.mkdir(shotsDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: options.headed !== true });
  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1440, height: 900 }
  });

  const pages = [];
  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    console.log(`[${index + 1}/${routes.length}] ${route.route}`);
    const result = await capturePage(context, baseUrl, route, { shotsDir, logsDir });
    pages.push(result);
  }

  await context.close();
  await browser.close();

  const manifest = {
    runId: path.basename(runDir),
    baseUrl,
    startedAt: pages[0]?.startedAt,
    finishedAt: new Date().toISOString(),
    routeFilter: {
      includeCategory: options.category ?? null,
      limit: options.limit ? Number(options.limit) : null,
      skipParameterized: true,
      skipAuthPublic: true
    },
    counts: {
      requested: routes.length,
      succeeded: pages.filter((p) => p.status === "ok").length,
      redirected: pages.filter((p) => p.redirected).length,
      failed: pages.filter((p) => p.status !== "ok").length
    },
    pages
  };
  await fs.writeFile(path.join(runDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`\nCrawl complete: ${path.relative(process.cwd(), runDir)}`);
  console.log(
    `  ${manifest.counts.succeeded} ok / ${manifest.counts.failed} failed / ${manifest.counts.redirected} redirected`
  );
}

async function loginAndSaveStorage({ baseUrl, storagePath }) {
  const email = process.env.EVAL_FIXTURE_STANDARD_EMAIL;
  const password = process.env.EVAL_FIXTURE_STANDARD_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "EVAL_FIXTURE_STANDARD_EMAIL and EVAL_FIXTURE_STANDARD_PASSWORD must be set in the environment."
    );
  }

  await fs.mkdir(path.dirname(storagePath), { recursive: true });

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}${LOGIN_PATH}`, { waitUntil: "domcontentloaded" });
    const emailBox = page.getByRole("textbox", { name: "이메일" });
    const passwordBox = page.getByRole("textbox", { name: "비밀번호" });
    await emailBox.click();
    await emailBox.pressSequentially(email, { delay: 10 });
    await passwordBox.click();
    await passwordBox.pressSequentially(password, { delay: 10 });
    const loginButton = page.getByRole("button", { name: "로그인", exact: true });
    await loginButton.waitFor({ state: "visible", timeout: 5_000 });
    await loginButton.click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), {
      timeout: POST_LOGIN_TIMEOUT_MS
    });
    await page.waitForLoadState("networkidle", { timeout: POST_LOGIN_TIMEOUT_MS }).catch(() => {});

    await context.storageState({ path: storagePath });
    console.log(`Login OK — storage state saved to ${path.relative(process.cwd(), storagePath)}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function assertStorage(storagePath) {
  try {
    await fs.access(storagePath);
  } catch {
    throw new Error(
      `No auth storage at ${path.relative(process.cwd(), storagePath)}. Run \`synapse-design-md crawl --login\` first.`
    );
  }
}

function selectRoutes(inventory, options) {
  const flat = [];
  for (const [category, list] of Object.entries(inventory.routes || {})) {
    if (category === "auth-public") continue;
    if (options.category && category !== options.category) continue;
    for (const entry of list) {
      if (entry.params && entry.params.length > 0) continue;
      flat.push({ ...entry, category });
    }
  }
  if (options.limit) return flat.slice(0, Number(options.limit));
  return flat;
}

async function capturePage(context, baseUrl, route, { shotsDir, logsDir }) {
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ text: msg.text() });
    }
  });

  const slug = slugify(route.route);
  const screenshotPath = path.join(shotsDir, `${slug}.png`);
  const logPath = path.join(logsDir, `${slug}.console.log`);

  const startedAt = new Date().toISOString();
  let response;
  let status = "ok";
  let error = null;
  try {
    response = await page.goto(`${baseUrl}${route.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000
    });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  } catch (e) {
    status = "navigation-failed";
    error = e.message;
  }

  const finalUrl = page.url();
  const finalPath = new URL(finalUrl).pathname;
  const redirected = finalPath !== route.route;

  let title = null;
  let computedSamples = null;
  let viewport = null;
  if (status === "ok") {
    try {
      title = await page.title();
      computedSamples = await page.evaluate(() => {
        const sample = (el) => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            backgroundColor: cs.backgroundColor,
            color: cs.color,
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            borderRadius: cs.borderRadius,
            borderColor: cs.borderColor
          };
        };
        return {
          body: sample(document.body),
          firstHeading: sample(document.querySelector("h1, h2")),
          firstButton: sample(document.querySelector("button"))
        };
      });
      viewport = page.viewportSize();
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch (e) {
      status = "capture-failed";
      error = e.message;
    }
  }

  if (consoleErrors.length > 0) {
    await fs.writeFile(logPath, consoleErrors.map((e) => e.text).join("\n") + "\n");
  }

  await page.close();

  return {
    route: route.route,
    category: route.category,
    file: route.file,
    startedAt,
    status,
    error,
    httpStatus: response?.status() ?? null,
    finalPath,
    redirected,
    title,
    viewport,
    consoleErrorCount: consoleErrors.length,
    consoleLog: consoleErrors.length > 0 ? path.relative(process.cwd(), logPath) : null,
    screenshot: status === "ok" ? path.relative(process.cwd(), screenshotPath) : null,
    computedSamples
  };
}

function slugify(route) {
  const cleaned = route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]+/gi, "_");
  return cleaned.length === 0 ? "root" : cleaned;
}

function runTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
