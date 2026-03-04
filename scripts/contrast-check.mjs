import fs from "node:fs";
import path from "node:path";

const constantsPath = path.resolve("src/constants.ts");
const source = fs.readFileSync(constantsPath, "utf8");

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
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

const themePattern = /\[Theme\.(\w+)\]: \{([\s\S]*?)\n  \},/g;
const themeRows = [];
let themeMatch = null;

while ((themeMatch = themePattern.exec(source))) {
  const theme = themeMatch[1];
  const block = themeMatch[2];
  const readHex = (key) => block.match(new RegExp(`${key}:\\s*"(#[0-9A-Fa-f]{6})"`))?.[1] ?? null;

  const fg = readHex("fgHex");
  const bg = readHex("bgHex");
  const ui = readHex("uiHex");
  const editorFg = readHex("editorFgHex");
  const editorBg = readHex("editorBgHex");
  if (!fg || !bg || !ui || !editorFg || !editorBg) continue;

  const bgRatio = contrastRatio(fg, bg);
  const uiRatio = contrastRatio(fg, ui);
  const editorRatio = contrastRatio(editorFg, editorBg);
  const minRatio = Math.min(bgRatio, uiRatio, editorRatio);

  themeRows.push({
    theme,
    bgRatio,
    uiRatio,
    editorRatio,
    minRatio,
    pass: minRatio >= 10,
  });
}

const presetBlockMatch = source.match(
  /export const PUBLICATION_PRESET_DEFAULTS: PublicationPreset\[] = \[([\s\S]*?)\n\];/
);
const presetBlock = presetBlockMatch?.[1] ?? "";
const presetPattern = /\{\s*id:\s*"([^"]+)"[\s\S]*?palette:\s*\{\s*bg:\s*"(#[0-9A-Fa-f]{6})",\s*text:\s*"(#[0-9A-Fa-f]{6})",\s*accent:\s*"(#[0-9A-Fa-f]{6})"/g;
const presetRows = [];
let presetMatch = null;

while ((presetMatch = presetPattern.exec(presetBlock))) {
  const id = presetMatch[1];
  const bg = presetMatch[2];
  const text = presetMatch[3];
  const accent = presetMatch[4];
  const textRatio = contrastRatio(text, bg);
  const accentRatio = contrastRatio(accent, bg);
  const minRatio = Math.min(textRatio, accentRatio);
  presetRows.push({
    id,
    textRatio,
    accentRatio,
    minRatio,
    pass: minRatio >= 10,
  });
}

console.log("Theme contrast (target >= 10:1)");
for (const row of themeRows.sort((a, b) => a.minRatio - b.minRatio)) {
  console.log(
    `${row.theme.padEnd(10)} min:${row.minRatio.toFixed(2)} bg:${row.bgRatio.toFixed(2)} ui:${row.uiRatio.toFixed(2)} editor:${row.editorRatio.toFixed(2)} ${row.pass ? "PASS" : "FAIL"}`
  );
}

console.log("\nPreset contrast (target >= 10:1 for text and accent)");
for (const row of presetRows.sort((a, b) => a.minRatio - b.minRatio)) {
  console.log(
    `${row.id.padEnd(10)} min:${row.minRatio.toFixed(2)} text:${row.textRatio.toFixed(2)} accent:${row.accentRatio.toFixed(2)} ${row.pass ? "PASS" : "FAIL"}`
  );
}

const hasFailures = themeRows.some((row) => !row.pass) || presetRows.some((row) => !row.pass);
if (hasFailures) {
  process.exitCode = 1;
}
