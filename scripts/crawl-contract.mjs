/**
 * crawl-contract.mjs
 *
 * Capture a per-component contract probe from a live page. Reuses the
 * storage state produced by `synapse-design-md crawl --login` so credentials
 * never live in this file.
 *
 *   synapse-design-md contract crawl \
 *     --url /workspace \
 *     --selector 'header nav a' \
 *     --component nav-item \
 *     [--selected-selector 'header nav a[aria-current="page"]'] \
 *     [--disabled-selector 'header nav a[aria-disabled="true"]'] \
 *     [--public] \
 *     [--headed] \
 *     [--out evidence/contracts]
 *
 * For each state (default / hover / focus-visible / active) the crawler uses
 * the Chrome DevTools Protocol `CSS.forcePseudoState` so getComputedStyle
 * returns the *real* state-driven values without flaky pointer/keyboard
 * choreography. `selected` and `disabled` are captured from sibling
 * selectors because they live in the DOM, not in CSS pseudo classes.
 *
 * Every dimensional value gets a token reverse-lookup via token-index.mjs;
 * the verifier then enforces token coverage on top of value equality.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadTokenIndex } from "./token-index.mjs";

const DEFAULT_BASE_URL = "https://test.synapse.sh";
const STORAGE_PATH = "auth/storage-state.json";

export async function crawlContract(options = {}) {
  const baseUrl = (options["base-url"] || process.env.SYNAPSE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const route = options.url;
  const selector = options.selector;
  const component = options.component;
  const outRoot = path.resolve(process.cwd(), options.out || "evidence/contracts");
  const selectedSelector = options["selected-selector"] || null;
  const disabledSelector = options["disabled-selector"] || null;
  const publicPage = options.public === true;

  if (!route || !selector || !component) {
    throw new Error(
      "Usage: synapse-design-md contract crawl --url <path> --selector <css> --component <name> [--selected-selector <css>] [--disabled-selector <css>] [--public] [--out <dir>]"
    );
  }

  const storagePath = path.resolve(process.cwd(), STORAGE_PATH);
  let storageState = null;
  if (publicPage) {
    storageState = undefined;
  } else {
    try {
      await fs.access(storagePath);
      storageState = storagePath;
    } catch {
      throw new Error(
        `No auth storage at ${STORAGE_PATH}. Run \`synapse-design-md crawl --login\` first, or pass --public for unauthenticated pages.`
      );
    }
  }

  const tokenIndex = await loadTokenIndex();

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: options.headed !== true });
  const context = await browser.newContext({
    ...(storageState ? { storageState } : {}),
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForSelector(selector, { timeout: 10_000 }).catch(() => {});

  // Disambiguate-by-text: if --text is provided, find the first element whose
  // textContent matches and tag it with data-synapse-target so CDP can locate
  // it via a standard CSS selector (CDP does not support Playwright's
  // :has-text pseudo).
  if (options.text) {
    const tagged = await page.evaluate(({ sel, text }) => {
      const els = Array.from(document.querySelectorAll(sel));
      const hit = els.find((el) => el.textContent.trim().includes(text));
      if (!hit) return false;
      hit.setAttribute("data-synapse-target", "1");
      return true;
    }, { sel: selector, text: options.text });
    if (!tagged) throw new Error(`No element matching selector ${selector} with text "${options.text}".`);
  }
  const effectiveSelector = options.text ? `[data-synapse-target]` : selector;

  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  const resolveNode = async (sel) => {
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
    return nodeId || null;
  };

  const captureState = async (sel, forced) => {
    const nodeId = await resolveNode(sel);
    if (!nodeId) return null;
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: forced ?? [] });
    const snap = await sampleElement(page, sel);
    // Reset for the next round.
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
    return snap;
  };

  const baseSnap = await captureState(effectiveSelector, []);
  if (!baseSnap) throw new Error(`Selector did not match any element: ${selector}`);

  const probe = {
    identity: { name: component, id: `crawl:${route} ${selector}` },
    source: {
      status: "captured",
      capturedAt: new Date().toISOString(),
      capturedFrom: `${baseUrl}${route}`,
      selector,
      selectedSelector,
      disabledSelector,
      authenticated: !publicPage,
      tool: "scripts/crawl-contract.mjs"
    },
    layout: snapToLayout(baseSnap, tokenIndex),
    typography: snapToTypography(baseSnap, tokenIndex),
    iconSlot: snapToIconSlot(baseSnap, tokenIndex),
    hitbox: snapToHitbox(baseSnap),
    states: {
      default:         snapToState(baseSnap, tokenIndex),
      hover:           snapToState(await captureState(effectiveSelector, ["hover"]), tokenIndex),
      "focus-visible": snapToFocusVisible(await captureState(effectiveSelector, ["focus", "focus-visible"]), tokenIndex),
      active:          snapToState(await captureState(effectiveSelector, ["active"]), tokenIndex),
      selected:        snapToSelected(selectedSelector ? await captureState(selectedSelector, []) : null, tokenIndex),
      disabled:        snapToState(disabledSelector ? await captureState(disabledSelector, []) : null, tokenIndex)
    },
    motion: snapToMotion(baseSnap),
    a11y: snapToA11y(baseSnap),
    composition: snapToComposition(baseSnap)
  };

  await context.close();
  await browser.close();

  const outDir = path.join(outRoot, component);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${stamp()}.probe.json`);
  await fs.writeFile(outPath, `${JSON.stringify(probe, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  return { outPath, probe };
}

/**
 * Read every shape-relevant attribute of a single element in one round-trip.
 * Returning a flat snapshot keeps the per-state captures cheap (1 evaluate
 * each) and the slicing functions side-effect free.
 */
async function sampleElement(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, "::before");
    const after = getComputedStyle(el, "::after");
    const rect = el.getBoundingClientRect();

    const k = (n) => cs.getPropertyValue(n);

    const children = [];
    for (const child of el.children) {
      const ccs = getComputedStyle(child);
      children.push({
        tag: child.tagName.toLowerCase(),
        role: child.getAttribute("role"),
        dataComponent: child.getAttribute("data-component"),
        ariaHidden: child.getAttribute("aria-hidden"),
        rect: child.getBoundingClientRect().toJSON?.() ?? {
          width: child.getBoundingClientRect().width,
          height: child.getBoundingClientRect().height
        },
        display: ccs.display,
        position: ccs.position
      });
    }

    const parent = el.parentElement;
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 80),
      rect: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
      parent: parent ? {
        tag: parent.tagName.toLowerCase(),
        role: parent.getAttribute("role"),
        dataComponent: parent.getAttribute("data-component"),
        ariaLabel: parent.getAttribute("aria-label"),
        // Find the nearest semantically-meaningful ancestor for slot context.
        ancestor: (() => {
          for (let p = parent; p; p = p.parentElement) {
            const tag = p.tagName.toLowerCase();
            if (["header", "nav", "main", "aside", "footer", "form", "dialog"].includes(tag)) return tag;
            if (p.getAttribute("data-component")) return `data-component=${p.getAttribute("data-component")}`;
            if (p.getAttribute("role")) return `role=${p.getAttribute("role")}`;
          }
          return null;
        })()
      } : null,
      aria: {
        role: el.getAttribute("role") || el.tagName.toLowerCase() === "a" ? (el.getAttribute("role") || "link") : null,
        current: el.getAttribute("aria-current"),
        disabled: el.getAttribute("aria-disabled"),
        label: el.getAttribute("aria-label"),
        labelledby: el.getAttribute("aria-labelledby"),
        tabIndex: el.tabIndex
      },
      style: {
        display: k("display"),
        flexDirection: k("flex-direction"),
        alignItems: k("align-items"),
        justifyContent: k("justify-content"),
        gap: k("gap"),
        rowGap: k("row-gap"),
        columnGap: k("column-gap"),
        height: k("height"),
        width: k("width"),
        paddingTop: k("padding-top"),
        paddingBottom: k("padding-bottom"),
        paddingLeft: k("padding-left"),
        paddingRight: k("padding-right"),
        borderTopWidth: k("border-top-width"),
        borderTopStyle: k("border-top-style"),
        borderTopColor: k("border-top-color"),
        borderRadius: k("border-radius"),
        color: k("color"),
        backgroundColor: k("background-color"),
        cursor: k("cursor"),
        fontFamily: k("font-family"),
        fontSize: k("font-size"),
        fontWeight: k("font-weight"),
        lineHeight: k("line-height"),
        letterSpacing: k("letter-spacing"),
        fontFeatureSettings: k("font-feature-settings"),
        whiteSpace: k("white-space"),
        textOverflow: k("text-overflow"),
        outlineWidth: k("outline-width"),
        outlineOffset: k("outline-offset"),
        outlineStyle: k("outline-style"),
        outlineColor: k("outline-color"),
        boxShadow: k("box-shadow"),
        transitionProperty: k("transition-property"),
        transitionDuration: k("transition-duration"),
        transitionTimingFunction: k("transition-timing-function"),
        transitionDelay: k("transition-delay")
      },
      pseudo: {
        beforeContent: before.getPropertyValue("content"),
        beforeBackground: before.getPropertyValue("background-color"),
        beforeWidth: before.getPropertyValue("width"),
        beforeHeight: before.getPropertyValue("height"),
        beforeLeft: before.getPropertyValue("left"),
        beforePosition: before.getPropertyValue("position"),
        afterContent: after.getPropertyValue("content"),
        afterBackground: after.getPropertyValue("background-color")
      },
      children
    };
  }, selector);
}

// --- slice converters ----------------------------------------------------

function dim(value, tokenIndex, prefer) {
  if (value == null) return null;
  const m = String(value).match(/^(-?[\d.]+)(px|rem|em|%)$/);
  if (!m) return null;
  const out = { value: Number(m[1]), unit: m[2] };
  const opts = prefer ? { prefer } : undefined;
  const token = tokenIndex.lookup(value, opts) ?? tokenIndex.lookup(`${out.value}${out.unit}`, opts);
  if (token) out.token = token;
  return out;
}

function color(value, tokenIndex) {
  if (!value || value === "rgba(0, 0, 0, 0)" || value === "transparent") {
    return value === "transparent" || value === "rgba(0, 0, 0, 0)" ? "transparent" : null;
  }
  const token = tokenIndex.lookup(value, { prefer: ["colors."] });
  return token ? { token, raw: value } : { raw: value };
}

function snapToLayout(snap, tokenIndex) {
  const s = snap.style;
  const SPACING = ["spacing.", "sizes."];
  const SIZE = ["sizes.", "spacing."];
  const RADIUS = ["rounded."];
  return {
    display: s.display,
    direction: s.flexDirection,
    align: s.alignItems,
    justify: s.justifyContent,
    gap: dim(s.gap, tokenIndex, SPACING),
    height: dim(s.height, tokenIndex, SIZE),
    paddingTop: dim(s.paddingTop, tokenIndex, SPACING),
    paddingBottom: dim(s.paddingBottom, tokenIndex, SPACING),
    paddingLeft: dim(s.paddingLeft, tokenIndex, SPACING),
    paddingRight: dim(s.paddingRight, tokenIndex, SPACING),
    border: {
      width: dim(s.borderTopWidth, tokenIndex, SPACING),
      style: s.borderTopStyle,
      color: color(s.borderTopColor, tokenIndex),
      radius: dim(firstRadius(s.borderRadius), tokenIndex, RADIUS)
    }
  };
}

function firstRadius(value) {
  return String(value || "").split(/\s+/)[0] || value;
}

function snapToTypography(snap, tokenIndex) {
  const s = snap.style;
  const TY_SIZE = ["typography.scale.", "spacing."];
  const TY_LH = ["typography.scale.", "spacing."];
  const TY_LS = ["typography.scale."];
  return {
    family: s.fontFamily,
    size: dim(s.fontSize, tokenIndex, TY_SIZE),
    weight: Number(s.fontWeight) || s.fontWeight,
    lineHeight: dim(s.lineHeight, tokenIndex, TY_LH),
    letterSpacing: dim(s.letterSpacing, tokenIndex, TY_LS),
    fontFeatureSettings: s.fontFeatureSettings,
    whiteSpace: s.whiteSpace,
    textOverflow: s.textOverflow
  };
}

function snapToIconSlot(snap, tokenIndex) {
  const icon = snap.children.find((c) => c.tag === "svg" || c.tag === "i" || c.dataComponent === "icon");
  if (!icon) return null;
  const sizePx = Math.round(icon.rect.width);
  const tokenHit = tokenIndex.lookup(`${sizePx}px`, { prefer: ["sizes.", "spacing."] });
  return {
    size: { value: sizePx, unit: "px", ...(tokenHit ? { token: tokenHit } : {}) },
    position: snap.children.indexOf(icon) === 0 ? "leading" : "trailing",
    baselineOffsetY: null  // requires baseline calculation; left for a future refinement
  };
}

function snapToHitbox(snap) {
  return {
    minWidth: { value: Math.round(snap.rect.width), unit: "px" },
    minHeight: { value: Math.round(snap.rect.height), unit: "px" }
  };
}

function snapToState(snap, tokenIndex) {
  if (!snap) return null;
  const s = snap.style;
  return {
    color: color(s.color, tokenIndex),
    backgroundColor: color(s.backgroundColor, tokenIndex),
    cursor: s.cursor,
    indicator: detectIndicator(snap, tokenIndex)
  };
}

function snapToFocusVisible(snap, tokenIndex) {
  if (!snap) return null;
  const s = snap.style;
  return {
    outlineWidth: dim(s.outlineWidth, tokenIndex, ["spacing."]),
    outlineOffset: dim(s.outlineOffset, tokenIndex, ["spacing."]),
    outlineStyle: s.outlineStyle,
    outlineColor: color(s.outlineColor, tokenIndex),
    boxShadow: s.boxShadow !== "none" ? s.boxShadow : null
  };
}

function snapToSelected(snap, tokenIndex) {
  if (!snap) return null;
  const s = snap.style;
  return {
    color: color(s.color, tokenIndex),
    backgroundColor: color(s.backgroundColor, tokenIndex),
    indicator: detectIndicator(snap, tokenIndex)
  };
}

function detectIndicator(snap, tokenIndex) {
  if (!snap?.pseudo) return "none";
  const p = snap.pseudo;
  const hasBefore = p.beforeContent && p.beforeContent !== "none" && p.beforeContent !== "normal";
  if (!hasBefore) return "none";
  // Heuristic: ::before with explicit width and a non-transparent background is a bar/dot indicator.
  const w = parseFloat(p.beforeWidth);
  const h = parseFloat(p.beforeHeight);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return "none";
  return {
    geometry: w < h ? "bar" : h < w ? "underline" : "dot",
    thickness: dim(w < h ? p.beforeWidth : p.beforeHeight, tokenIndex),
    position: p.beforeLeft && parseFloat(p.beforeLeft) <= 2 ? "leading" : "unknown",
    color: color(p.beforeBackground, tokenIndex)
  };
}

function snapToMotion(snap) {
  const s = snap.style;
  const props = s.transitionProperty.split(",").map((p) => p.trim()).filter(Boolean);
  const durs = s.transitionDuration.split(",").map((p) => p.trim()).filter(Boolean);
  const eases = s.transitionTimingFunction.split(",").map((p) => p.trim()).filter(Boolean);
  const dels = s.transitionDelay.split(",").map((p) => p.trim()).filter(Boolean);
  if (props.length === 0 || (props.length === 1 && props[0] === "all" && durs[0] === "0s")) {
    return { reducedMotion: { duration: { value: 0, unit: "ms" }, property: "none" } };
  }
  const out = {};
  for (let i = 0; i < props.length; i += 1) {
    out[`transition[${i}]`] = {
      property: props[i],
      duration: parseTimeToken(durs[i] ?? durs[0]),
      easing: eases[i] ?? eases[0],
      delay: parseTimeToken(dels[i] ?? dels[0] ?? "0s")
    };
  }
  return out;
}

function parseTimeToken(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^([\d.]+)(ms|s)$/);
  if (!m) return null;
  const v = Number(m[1]);
  return m[2] === "s"
    ? { value: Math.round(v * 1000), unit: "ms" }
    : { value: Math.round(v), unit: "ms" };
}

function snapToA11y(snap) {
  return {
    role: snap.aria.role,
    current: {
      attribute: snap.aria.current != null ? "aria-current" : null,
      expectedValueWhenSelected: snap.aria.current || null
    },
    tabIndex: snap.aria.tabIndex
  };
}

function snapToComposition(snap) {
  // Prefer the semantically meaningful ancestor (header/nav/main/...) over the literal parent tag.
  const parent = snap.parent?.ancestor || snap.parent?.dataComponent || snap.parent?.tag || null;
  return {
    parent,
    parentRaw: snap.parent || null,
    children: {
      icon:  { allowed: snap.children.filter((c) => c.tag === "svg" || c.tag === "i").map(() => "Icon") },
      label: { allowed: snap.children.filter((c) => c.tag === "span" || c.tag === "p").map(() => "Text") },
      indicator: { allowed: [] }
    }
  };
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
