import fs from "node:fs";
import path from "node:path";

const constantsPath = path.resolve("src/constants.ts");
const siteCssPath = path.resolve("apps/site/src/index.css");
const constantsSource = fs.readFileSync(constantsPath, "utf8");
const siteCssSource = fs.readFileSync(siteCssPath, "utf8");

function normalizeHex(hex) {
  const clean = hex.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean.split("").map((part) => `${part}${part}`).join("")}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean}`;
  return null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid hex color: ${hex}`);
  const clean = normalized.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function hslToRgb(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [chroma, x, 0];
  else if (h < 120) [r, g, b] = [x, chroma, 0];
  else if (h < 180) [r, g, b] = [0, chroma, x];
  else if (h < 240) [r, g, b] = [0, x, chroma];
  else if (h < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(fg, bg, fgWeight) {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  return rgbToHex(fgRgb.map((channel, index) => Math.round(channel * fgWeight + bgRgb[index] * (1 - fgWeight))));
}

function channel(value) {
  const normalized = value / 255;
  if (normalized <= 0.03928) return normalized / 12.92;
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA, hexB) {
  const a = luminance(hexA);
  const b = luminance(hexB);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

function ratioRow(surface, pair, fg, bg, target) {
  const ratio = contrastRatio(fg, bg);
  return { surface, pair, fg, bg, target, ratio, pass: ratio >= target };
}

function readThemeRows() {
  const themePattern = /\[Theme\.(\w+)\]: \{([\s\S]*?)\n  \},/g;
  const rows = [];
  let match = null;
  while ((match = themePattern.exec(constantsSource))) {
    const theme = match[1];
    const block = match[2];
    const readHex = (key) => block.match(new RegExp(`${key}:\\s*"(#[0-9A-Fa-f]{6})"`))?.[1] ?? null;
    const fg = readHex("fgHex");
    const bg = readHex("bgHex");
    const ui = readHex("uiHex");
    const editorFg = readHex("editorFgHex");
    const editorBg = readHex("editorBgHex");
    const accent = readHex("accentHex");
    if (!fg || !bg || !ui || !editorFg || !editorBg || !accent) continue;
    rows.push(ratioRow(`theme:${theme}`, "fg/bg", fg, bg, 10));
    rows.push(ratioRow(`theme:${theme}`, "fg/ui", fg, ui, 4.5));
    rows.push(ratioRow(`theme:${theme}`, "editor", editorFg, editorBg, 10));
    rows.push(ratioRow(`theme:${theme}`, "preview text/editor", editorFg, editorBg, 4.5));
    rows.push(ratioRow(`theme:${theme}`, "preview muted/editor", mixHex(editorFg, editorBg, 0.76), editorBg, 4.5));
    rows.push(ratioRow(`theme:${theme}`, "accent/bg", accent, bg, 3));
  }
  return rows;
}

function readPublicationPresetRows() {
  const block = constantsSource.match(/export const PUBLICATION_PRESET_DEFAULTS: PublicationPreset\[] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  const presetPattern = /createPublicationPreset\(\s*"([^"]+)"[\s\S]*?\{\s*bg:\s*"(#[0-9A-Fa-f]{6})",\s*text:\s*"(#[0-9A-Fa-f]{6})",\s*accent:\s*"(#[0-9A-Fa-f]{6})",\s*muted:\s*"(#[0-9A-Fa-f]{6})"/g;
  const rows = [];
  let match = null;
  while ((match = presetPattern.exec(block))) {
    const [, id, bg, text, accent, muted] = match;
    rows.push(ratioRow(`preset:${id}`, "text/bg", text, bg, 4.5));
    rows.push(ratioRow(`preset:${id}`, "muted/bg", muted, bg, 4.5));
    rows.push(ratioRow(`preset:${id}`, "accent/bg", accent, bg, 3));
  }
  return rows;
}

function readSiteTokenRows() {
  const rootBlock = siteCssSource.match(/:root\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
  const tokens = new Map();
  for (const match of rootBlock.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) {
    const raw = match[2].trim();
    const hex = normalizeHex(raw);
    if (hex) {
      tokens.set(match[1], hex);
      continue;
    }
    const hsl = raw.match(/^([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%$/);
    if (hsl) {
      tokens.set(match[1], rgbToHex(hslToRgb(Number(hsl[1]) % 360, Number(hsl[2]), Number(hsl[3]))));
    }
  }
  const pairs = [
    ["foreground", "background", 4.5],
    ["card-foreground", "card", 4.5],
    ["popover-foreground", "popover", 4.5],
    ["primary-foreground", "primary", 4.5],
    ["secondary-foreground", "secondary", 4.5],
    ["accent-foreground", "accent", 4.5],
    ["destructive-foreground", "destructive", 4.5],
    ["sidebar-foreground", "sidebar-background", 4.5],
    ["sidebar-primary-foreground", "sidebar-primary", 4.5],
    ["sidebar-accent-foreground", "sidebar-accent", 4.5],
    ["muted-foreground", "muted", 3],
  ];
  return pairs
    .map(([fgToken, bgToken, target]) => {
      const fg = tokens.get(fgToken);
      const bg = tokens.get(bgToken);
      return fg && bg ? ratioRow("promo-site", `${fgToken}/${bgToken}`, fg, bg, target) : null;
    })
    .filter(Boolean);
}

function printGroup(title, rows) {
  console.log(`\n${title}`);
  for (const row of rows.sort((a, b) => a.ratio - b.ratio || a.surface.localeCompare(b.surface))) {
    console.log(`${row.surface.padEnd(18)} ${row.pair.padEnd(34)} ${row.ratio.toFixed(2)} target:${row.target.toFixed(1)} ${row.pass ? "PASS" : "FAIL"}`);
  }
}

const themeRows = readThemeRows();
const presetRows = readPublicationPresetRows();
const siteRows = readSiteTokenRows();

printGroup("Theme contrast", themeRows);
printGroup("Publication preset contrast", presetRows);
printGroup("Promo site token contrast", siteRows);

const failures = [...themeRows, ...presetRows, ...siteRows].filter((row) => !row.pass);
if (presetRows.length === 0) failures.push({ surface: "preset", pair: "missing", ratio: 0, target: 1, pass: false });
if (failures.length > 0) {
  console.error(`\nContrast check failed for ${failures.length} pair(s).`);
  process.exitCode = 1;
}
