import fs from "node:fs/promises";
import path from "node:path";
import { fromRoot } from "./paths.mjs";

export async function preview(options = {}) {
  const cwd = process.cwd();
  const designPath = path.join(cwd, "DESIGN.md");
  const source = await fs.readFile(designPath, "utf8");

  const fm = extractFrontmatter(source);
  if (fm === null) {
    throw new Error("DESIGN.md is missing YAML frontmatter");
  }

  const tokens = parseYaml(fm);
  resolveRefs(tokens, tokens);

  const template = await fs.readFile(fromRoot("templates", "preview.html.tmpl"), "utf8");
  const html = renderTemplate(template, tokens);

  const outName = options.out || "preview.html";
  const outPath = path.isAbsolute(outName) ? outName : path.join(cwd, outName);
  await fs.writeFile(outPath, html);

  console.log(`preview written: ${path.relative(cwd, outPath)}`);
}

function extractFrontmatter(source) {
  const lines = source.split("\n");
  if (lines[0] !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(1, i).join("\n");
  }
  return null;
}

function parseYaml(text) {
  const lines = text.split("\n");
  const root = {};
  parseBlock(lines, 0, 0, root);
  return root;
}

function parseBlock(lines, start, baseIndent, out) {
  let i = start;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.trimStart().startsWith("#")) {
      i += 1;
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    if (indent < baseIndent) return i;
    if (indent > baseIndent) {
      i += 1;
      continue;
    }

    const line = raw.slice(indent);
    const colonIdx = findKeyEnd(line);
    if (colonIdx === -1) {
      i += 1;
      continue;
    }
    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (rawValue === "|") {
      const block = readBlockScalar(lines, i + 1, baseIndent);
      out[key] = block.value;
      i = block.next;
    } else if (rawValue === "") {
      const childIndent = detectChildIndent(lines, i + 1, baseIndent);
      if (childIndent === -1) {
        out[key] = null;
        i += 1;
      } else {
        const child = {};
        i = parseBlock(lines, i + 1, childIndent, child);
        out[key] = child;
      }
    } else if (rawValue.startsWith("{")) {
      out[key] = parseFlowMap(rawValue);
      i += 1;
    } else {
      out[key] = parseScalar(rawValue);
      i += 1;
    }
  }
  return i;
}

function readBlockScalar(lines, from, parentIndent) {
  const buf = [];
  let j = from;
  let childIndent = -1;
  while (j < lines.length) {
    const rj = lines[j];
    if (rj.trim() === "") {
      buf.push("");
      j += 1;
      continue;
    }
    const ind = rj.length - rj.trimStart().length;
    if (childIndent === -1) {
      if (ind <= parentIndent) break;
      childIndent = ind;
    }
    if (ind < childIndent) break;
    buf.push(rj.slice(childIndent));
    j += 1;
  }
  return { value: buf.join("\n").replace(/\n+$/, ""), next: j };
}

function detectChildIndent(lines, from, parentIndent) {
  for (let j = from; j < lines.length; j++) {
    if (lines[j].trim() === "" || lines[j].trimStart().startsWith("#")) continue;
    const ind = lines[j].length - lines[j].trimStart().length;
    return ind > parentIndent ? ind : -1;
  }
  return -1;
}

function findKeyEnd(line) {
  let inQuote = null;
  for (let k = 0; k < line.length; k++) {
    const c = line[k];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      continue;
    }
    if (c === ":") {
      if (k === line.length - 1 || line[k + 1] === " " || line[k + 1] === "\t") return k;
    }
  }
  return -1;
}

function parseFlowMap(s) {
  const trimmed = s.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return {};
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return {};
  const out = {};
  for (const part of splitTopLevelCommas(inner)) {
    const colon = findKeyEnd(part);
    if (colon === -1) continue;
    const k = part.slice(0, colon).trim();
    const v = part.slice(colon + 1).trim();
    if (v.startsWith("{")) {
      out[k] = parseFlowMap(v);
    } else {
      out[k] = parseScalar(v);
    }
  }
  return out;
}

function splitTopLevelCommas(s) {
  const out = [];
  let buf = "";
  let inQuote = null;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuote) {
      buf += c;
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      buf += c;
      continue;
    }
    if (c === "{" || c === "[") {
      depth += 1;
      buf += c;
      continue;
    }
    if (c === "}" || c === "]") {
      depth -= 1;
      buf += c;
      continue;
    }
    if (c === "," && depth === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function parseScalar(v) {
  if (v === "") return "";
  if (v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  return v;
}

function resolveRefs(node, root) {
  if (node === null || typeof node !== "object") return;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === "string") {
      node[k] = resolveString(v, root);
    } else if (typeof v === "object") {
      resolveRefs(v, root);
    }
  }
}

function resolveString(s, root) {
  let cur = s;
  for (let i = 0; i < 8; i++) {
    const next = cur.replace(/\{([a-zA-Z0-9._-]+)\}/g, (match, ref) => {
      const v = lookupPath(root, ref);
      if (typeof v === "string") return v;
      if (typeof v === "number") return String(v);
      return match;
    });
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

function lookupPath(root, ref) {
  const parts = ref.split(".");
  let n = root;
  for (const p of parts) {
    if (n && typeof n === "object" && p in n) n = n[p];
    else return undefined;
  }
  return n;
}

function renderTemplate(tmpl, tokens) {
  const colors = tokens.colors || {};
  const typography = (tokens.typography && tokens.typography.scale) || {};
  const fontFamilies = (tokens.typography && tokens.typography.fontFamily) || {};
  const spacing = tokens.spacing || {};
  const rounded = tokens.rounded || {};
  const shadows = tokens.shadows || {};
  const components = tokens.components || {};

  const slots = {
    NAME: escapeHtml(String(tokens.name || "Synapse")),
    DESCRIPTION: escapeHtml(String(tokens.description || "")).replace(/\n/g, "<br>\n"),
    VERSION: escapeHtml(String(tokens.version || "alpha")),
    COLOR_SWATCHES: renderColorSwatches(colors),
    TYPE_SCALE: renderTypeScale(typography, fontFamilies),
    SPACING_SCALE: renderSpacingScale(spacing),
    RADIUS_SCALE: renderRadiusScale(rounded),
    SHADOW_SCALE: renderShadowScale(shadows),
    COMPONENT_BUTTONS: renderButtons(components, typography),
    COMPONENT_INPUTS: renderInputs(components, typography),
    COMPONENT_TABLES: renderTables(components, typography),
    COMPONENT_NAV: renderNav(components, typography),
    COMPONENT_STATUS: renderStatus(components, typography),
    COMPONENT_CONTAINERS: renderContainers(components, typography),
    GENERATED_AT: new Date().toISOString(),
    PAGE_BG: colors.surface || "#FFFFFF",
    PAGE_FG: colors.ink || "#111827",
    PANEL_BG: colors["surface-subtle"] || "#F8FAFC",
    HAIRLINE: colors.hairline || "#E5E7EB"
  };

  return tmpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in slots ? slots[k] : m));
}

function renderColorSwatches(colors) {
  const groups = {
    "Brand & Action": ["accent", "accent-hover", "accent-pressed", "accent-focus-ring", "on-accent"],
    Surface: ["surface", "surface-subtle", "surface-elevated"],
    Text: ["ink", "ink-muted", "ink-subtle"],
    Border: ["hairline", "hairline-strong"],
    Semantic: ["success", "success-subtle", "warning", "warning-subtle", "danger", "danger-subtle", "info", "info-subtle"],
    State: ["selected-bg", "hover-bg", "disabled-bg", "disabled-fg"],
    Overlay: ["overlay-scrim"]
  };
  const html = [];
  for (const [groupName, keys] of Object.entries(groups)) {
    const swatches = keys
      .filter((k) => k in colors)
      .map((k) => {
        const value = String(colors[k]);
        const isDark = colorIsDark(value);
        const labelColor = isDark ? "#FFFFFF" : "#111827";
        return `      <div class="swatch" style="background:${escapeHtml(value)};color:${labelColor};">
        <div class="swatch-name">${escapeHtml(k)}</div>
        <div class="swatch-value">${escapeHtml(value)}</div>
      </div>`;
      })
      .join("\n");
    html.push(`    <div class="swatch-group">
      <h3 class="group-title">${escapeHtml(groupName)}</h3>
      <div class="swatch-row">
${swatches}
      </div>
    </div>`);
  }
  return html.join("\n");
}

function renderTypeScale(scale, families) {
  const rows = [];
  for (const [token, def] of Object.entries(scale)) {
    if (!def || typeof def !== "object") continue;
    const family = resolveFamily(def.fontFamily, families);
    const style = [
      `font-family:${escapeAttr(family)}`,
      def.fontSize && `font-size:${escapeAttr(def.fontSize)}`,
      def.fontWeight && `font-weight:${escapeAttr(def.fontWeight)}`,
      def.lineHeight && `line-height:${escapeAttr(def.lineHeight)}`,
      def.letterSpacing && `letter-spacing:${escapeAttr(def.letterSpacing)}`,
      def.textTransform && `text-transform:${escapeAttr(def.textTransform)}`
    ]
      .filter(Boolean)
      .join(";");
    const meta = `${def.fontSize || "—"} · ${def.fontWeight || "—"} · ${def.lineHeight || "—"}${def.letterSpacing ? ` · ${def.letterSpacing}` : ""}`;
    rows.push(`    <div class="type-row">
      <div class="type-meta"><code>${escapeHtml(token)}</code><span class="type-spec">${escapeHtml(meta)}</span></div>
      <div class="type-sample" style="${style}">The quick brown fox jumps over the lazy dog 0123456789</div>
    </div>`);
  }
  return rows.join("\n");
}

function resolveFamily(family, families) {
  if (!family) return "inherit";
  if (family in families) return families[family];
  return family;
}

function renderSpacingScale(spacing) {
  const rows = Object.entries(spacing).map(([token, value]) => {
    return `    <div class="scale-row">
      <code>${escapeHtml(token)}</code>
      <div class="scale-bar" style="width:${escapeAttr(String(value))};"></div>
      <span class="scale-value">${escapeHtml(String(value))}</span>
    </div>`;
  });
  return rows.join("\n");
}

function renderRadiusScale(rounded) {
  const rows = Object.entries(rounded).map(([token, value]) => {
    return `    <div class="scale-row">
      <code>${escapeHtml(token)}</code>
      <div class="radius-box" style="border-radius:${escapeAttr(String(value))};"></div>
      <span class="scale-value">${escapeHtml(String(value))}</span>
    </div>`;
  });
  return rows.join("\n");
}

function renderShadowScale(shadows) {
  const entries = Object.entries(shadows);
  if (entries.length === 0) {
    const overlays = [
      ["overlay-sm", "0 2px 8px rgba(17, 24, 39, 0.08)"],
      ["overlay-md", "0 8px 24px rgba(17, 24, 39, 0.12)"],
      ["overlay-lg", "0 16px 40px rgba(17, 24, 39, 0.16)"]
    ];
    const rows = overlays
      .map(([token, value]) => `    <div class="scale-row">
      <code>${escapeHtml(token)}</code>
      <div class="shadow-card" style="box-shadow:${escapeAttr(value)};"></div>
      <span class="scale-value">${escapeHtml(value)}</span>
    </div>`)
      .join("\n");
    return `    <p class="section-note">Shadow values are documented in the markdown body (Elevation &amp; Depth) rather than the YAML token map. Rendered below from the documented overlay values.</p>
${rows}`;
  }
  const rows = entries.map(([token, value]) => `    <div class="scale-row">
      <code>${escapeHtml(token)}</code>
      <div class="shadow-card" style="box-shadow:${escapeAttr(String(value))};"></div>
      <span class="scale-value">${escapeHtml(String(value))}</span>
    </div>`);
  return rows.join("\n");
}

function componentToStyle(comp, typography) {
  if (!comp || typeof comp !== "object") return "";
  const parts = [];
  if (comp.backgroundColor) parts.push(`background:${escapeAttr(String(comp.backgroundColor))}`);
  if (comp.textColor) parts.push(`color:${escapeAttr(String(comp.textColor))}`);
  if (comp.borderColor) {
    parts.push(`border:1px solid ${escapeAttr(String(comp.borderColor))}`);
  } else {
    parts.push("border:1px solid transparent");
  }
  if (comp.rounded) parts.push(`border-radius:${escapeAttr(String(comp.rounded))}`);
  if (comp.padding) parts.push(`padding:${escapeAttr(String(comp.padding))}`);
  if (comp.height) {
    parts.push(`height:${escapeAttr(String(comp.height))}`);
    parts.push("display:inline-flex");
    parts.push("align-items:center");
    parts.push("justify-content:center");
  }
  if (comp.width) parts.push(`width:${escapeAttr(String(comp.width))}`);
  if (comp.boxShadow) parts.push(`box-shadow:${escapeAttr(String(comp.boxShadow))}`);
  if (comp.textAlign) parts.push(`text-align:${escapeAttr(String(comp.textAlign))}`);
  if (comp.typography && typography[comp.typography]) {
    const t = typography[comp.typography];
    if (t.fontSize) parts.push(`font-size:${escapeAttr(t.fontSize)}`);
    if (t.fontWeight) parts.push(`font-weight:${escapeAttr(t.fontWeight)}`);
    if (t.lineHeight) parts.push(`line-height:${escapeAttr(t.lineHeight)}`);
    if (t.letterSpacing) parts.push(`letter-spacing:${escapeAttr(t.letterSpacing)}`);
    if (t.textTransform) parts.push(`text-transform:${escapeAttr(t.textTransform)}`);
  }
  return parts.join(";");
}

function mergeWithBase(base, variant) {
  if (!base || !variant) return variant || base || {};
  return { ...base, ...variant };
}

function renderStateRow(components, typography, baseKey, states, label) {
  const base = components[baseKey];
  if (!base) return "";
  const cells = [{ label: "default", comp: base }];
  for (const state of states) {
    const key = `${baseKey}-${state}`;
    if (components[key]) cells.push({ label: state, comp: mergeWithBase(base, components[key]) });
  }
  const items = cells
    .map(({ label: stateLabel, comp }) => {
      const style = componentToStyle(comp, typography);
      return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(stateLabel)}</div>
        <div class="state-render"><span style="${style}">${escapeHtml(label)}</span></div>
      </div>`;
    })
    .join("\n");
  return `    <div class="component-row">
      <h4 class="component-name"><code>${escapeHtml(baseKey)}</code></h4>
      <div class="state-grid">
${items}
      </div>
    </div>`;
}

function renderButtons(components, typography) {
  return [
    renderStateRow(components, typography, "button-primary", ["hover", "pressed", "focused", "disabled"], "Primary"),
    renderStateRow(components, typography, "button-secondary", ["hover", "focused", "disabled"], "Secondary"),
    renderStateRow(components, typography, "button-ghost", ["hover", "disabled"], "Ghost"),
    renderStateRow(components, typography, "button-danger", ["hover"], "Delete")
  ]
    .filter(Boolean)
    .join("\n");
}

function renderInputs(components, typography) {
  const rows = [];
  for (const baseKey of ["input", "select"]) {
    const base = components[baseKey];
    if (!base) continue;
    const states = [
      { label: "default", comp: base, value: baseKey === "select" ? "Choose option" : "value@example.com" },
      { label: "hover", comp: components[`${baseKey}-hover`] && mergeWithBase(base, components[`${baseKey}-hover`]) },
      { label: "focused", comp: components[`${baseKey}-focused`] && mergeWithBase(base, components[`${baseKey}-focused`]) },
      { label: "error", comp: components[`${baseKey}-error`] && mergeWithBase(base, components[`${baseKey}-error`]) },
      { label: "disabled", comp: components[`${baseKey}-disabled`] && mergeWithBase(base, components[`${baseKey}-disabled`]) }
    ].filter((s) => s.comp);
    const items = states
      .map(({ label, comp, value }) => {
        const style = componentToStyle(comp, typography);
        const text = value || (baseKey === "select" ? "Choose option" : "value@example.com");
        return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(label)}</div>
        <div class="state-render"><span style="${style};min-width:200px;text-align:left;justify-content:flex-start;">${escapeHtml(text)}</span></div>
      </div>`;
      })
      .join("\n");
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>${escapeHtml(baseKey)}</code></h4>
      <div class="state-grid">
${items}
      </div>
    </div>`);
  }
  const checkbox = components.checkbox;
  if (checkbox) {
    const states = [
      { label: "default", comp: checkbox },
      { label: "checked", comp: components["checkbox-checked"] && mergeWithBase(checkbox, components["checkbox-checked"]) },
      { label: "disabled", comp: components["checkbox-disabled"] && mergeWithBase(checkbox, components["checkbox-disabled"]) }
    ].filter((s) => s.comp);
    const items = states
      .map(({ label, comp }) => {
        const style = componentToStyle(comp, typography) + ";width:16px;height:16px;display:inline-block";
        return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(label)}</div>
        <div class="state-render"><span style="${style}"></span></div>
      </div>`;
      })
      .join("\n");
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>checkbox</code></h4>
      <div class="state-grid">
${items}
      </div>
    </div>`);
  }
  return rows.join("\n");
}

function renderTables(components, typography) {
  const row = components["table-row"];
  const header = components["table-header-cell"];
  const hover = components["table-row-hover"] && mergeWithBase(row, components["table-row-hover"]);
  const selected = components["table-row-selected"] && mergeWithBase(row, components["table-row-selected"]);
  if (!row || !header) return "";
  const cellStyle = (variant) =>
    `${componentToStyle(variant, typography)};display:table-cell;border-top:none;border-left:none;border-right:none`;
  return `    <div class="component-row">
      <h4 class="component-name"><code>table-row / -hover / -selected · table-header-cell</code></h4>
      <div class="table-render">
        <div class="table-pseudo">
          <div class="table-tr">
            <span style="${cellStyle(header)}">ID</span>
            <span style="${cellStyle(header)}">Status</span>
            <span style="${cellStyle(header)}">Last Run</span>
          </div>
          <div class="table-tr">
            <span style="${cellStyle(row)};font-family:ui-monospace,monospace">job_4f2a</span>
            <span style="${cellStyle(row)}">succeeded</span>
            <span style="${cellStyle(row)};text-align:right;font-family:ui-monospace,monospace">2026-05-19 14:02</span>
          </div>
          <div class="table-tr">
            <span style="${cellStyle(hover || row)};font-family:ui-monospace,monospace">job_4f2b</span>
            <span style="${cellStyle(hover || row)}">running (hover)</span>
            <span style="${cellStyle(hover || row)};text-align:right;font-family:ui-monospace,monospace">2026-05-19 14:05</span>
          </div>
          <div class="table-tr">
            <span style="${cellStyle(selected || row)};font-family:ui-monospace,monospace">job_4f2c</span>
            <span style="${cellStyle(selected || row)}">queued (selected)</span>
            <span style="${cellStyle(selected || row)};text-align:right;font-family:ui-monospace,monospace">2026-05-19 14:08</span>
          </div>
        </div>
      </div>
    </div>`;
}

function renderNav(components, typography) {
  const rows = [];
  const nav = components["nav-item"];
  if (nav) {
    const states = [
      { label: "default", comp: nav, text: "Pipelines" },
      { label: "hover", comp: components["nav-item-hover"] && mergeWithBase(nav, components["nav-item-hover"]), text: "Models" },
      { label: "active", comp: components["nav-item-active"] && mergeWithBase(nav, components["nav-item-active"]), text: "Datasets" }
    ].filter((s) => s.comp);
    const items = states
      .map(({ label, comp, text }) => {
        const style = componentToStyle(comp, typography) + ";display:block;min-width:160px;text-align:left;justify-content:flex-start";
        return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(label)}</div>
        <div class="state-render"><span style="${style}">${escapeHtml(text)}</span></div>
      </div>`;
      })
      .join("\n");
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>nav-item / -hover / -active</code></h4>
      <div class="state-grid">
${items}
      </div>
    </div>`);
  }
  const tab = components.tab;
  if (tab) {
    const states = [
      { label: "default", comp: tab, text: "Overview" },
      { label: "active", comp: components["tab-active"] && mergeWithBase(tab, components["tab-active"]), text: "Runs" },
      { label: "disabled", comp: components["tab-disabled"] && mergeWithBase(tab, components["tab-disabled"]), text: "Billing" }
    ].filter((s) => s.comp);
    const items = states
      .map(({ label, comp, text }) => {
        const style = componentToStyle(comp, typography);
        const accentBorder = label === "active" && comp.borderColor ? `;border-top:none;border-left:none;border-right:none;border-bottom:2px solid ${escapeAttr(comp.borderColor)}` : ";border:none";
        return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(label)}</div>
        <div class="state-render"><span style="${style}${accentBorder}">${escapeHtml(text)}</span></div>
      </div>`;
      })
      .join("\n");
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>tab / -active / -disabled</code></h4>
      <div class="state-grid">
${items}
      </div>
    </div>`);
  }
  return rows.join("\n");
}

function renderStatus(components, typography) {
  const rows = [];
  const variants = ["success", "warning", "danger", "info", "neutral"];
  const pillCells = variants
    .map((v) => {
      const key = `status-pill-${v}`;
      const comp = components[key];
      if (!comp) return "";
      const style = componentToStyle(comp, typography);
      return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(v)}</div>
        <div class="state-render"><span style="${style}">${escapeHtml(v)}</span></div>
      </div>`;
    })
    .filter(Boolean)
    .join("\n");
  if (pillCells) {
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>status-pill-{success,warning,danger,info,neutral}</code></h4>
      <div class="state-grid">
${pillCells}
      </div>
    </div>`);
  }
  const chip = components["filter-chip"];
  if (chip) {
    const states = [
      { label: "default", comp: chip, text: "owner = me" },
      { label: "active", comp: components["filter-chip-active"] && mergeWithBase(chip, components["filter-chip-active"]), text: "status = active" },
      { label: "disabled", comp: components["filter-chip-disabled"] && mergeWithBase(chip, components["filter-chip-disabled"]), text: "tier = pro" }
    ].filter((s) => s.comp);
    const items = states
      .map(({ label, comp, text }) => {
        const style = componentToStyle(comp, typography);
        return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(label)}</div>
        <div class="state-render"><span style="${style}">${escapeHtml(text)}</span></div>
      </div>`;
      })
      .join("\n");
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>filter-chip / -active / -disabled</code></h4>
      <div class="state-grid">
${items}
      </div>
    </div>`);
  }
  return rows.join("\n");
}

function renderContainers(components, typography) {
  const rows = [];
  const items = [
    { key: "card-default", label: "card-default", inner: "Card body content sits on the surface with a hairline border and no shadow." },
    { key: "empty-state", label: "empty-state", inner: "No results match the current filters. Adjust filters to see more." },
    { key: "error-banner", label: "error-banner", inner: "Run failed: upstream dataset is unavailable." },
    { key: "modal-surface", label: "modal-surface", inner: "Modal content with overlay shadow." },
    { key: "popover-surface", label: "popover-surface", inner: "Popover content" },
    { key: "dropdown-surface", label: "dropdown-surface", inner: "Dropdown item" }
  ];
  for (const { key, label, inner } of items) {
    const comp = components[key];
    if (!comp) continue;
    const style = componentToStyle(comp, typography) + ";display:block";
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>${escapeHtml(label)}</code></h4>
      <div class="container-render"><div style="${style}">${escapeHtml(inner)}</div></div>
    </div>`);
  }
  const toasts = ["success", "warning", "danger", "info"];
  const toastCells = toasts
    .map((v) => {
      const comp = components[`toast-${v}`];
      if (!comp) return "";
      const style = componentToStyle(comp, typography) + ";display:block;border-left-width:3px";
      return `      <div class="state-cell">
        <div class="state-label">${escapeHtml(v)}</div>
        <div class="state-render"><div style="${style}">${escapeHtml(v)} toast — operation reported a ${v} state.</div></div>
      </div>`;
    })
    .filter(Boolean)
    .join("\n");
  if (toastCells) {
    rows.push(`    <div class="component-row">
      <h4 class="component-name"><code>toast-{success,warning,danger,info}</code></h4>
      <div class="state-grid">
${toastCells}
      </div>
    </div>`);
  }
  return rows.join("\n");
}

function colorIsDark(value) {
  const v = value.trim();
  if (v.startsWith("rgba")) {
    const m = v.match(/rgba?\(([^)]+)\)/i);
    if (!m) return false;
    const [r, g, b] = m[1].split(",").map((x) => parseFloat(x.trim()));
    return luminance(r, g, b) < 0.5;
  }
  if (v.startsWith("#")) {
    let hex = v.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return luminance(r, g, b) < 0.5;
  }
  return false;
}

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}
