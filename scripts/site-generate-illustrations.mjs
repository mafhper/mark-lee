import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const outputDir = path.join(root, "apps", "site", "public", "assets", "illustrations");
const fixtureFile = path.join(root, "apps", "site", "src", "content", "fixtures", "illustration-fixtures.json");
const manifestFile = path.join(root, "apps", "site", "src", "content", "fixtures", "illustrations.mock.json");

const ratioMap = {
  "16:10": { width: 1600, height: 1000 },
  "4:3": { width: 1200, height: 900 },
  "3:2": { width: 1500, height: 1000 },
};

const palette = {
  page: "#0b0e14",
  panel: "#151c2a",
  panelSoft: "#1c2638",
  border: "#2a3448",
  borderStrong: "#3a475f",
  text: "#f2f6ff",
  muted: "#96a4be",
  accentGold: "#e7be73",
  accentBlue: "#7ea7ff",
  accentRose: "#e7a9cf",
  green: "#7fe2a2",
};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgText({
  x,
  y,
  text,
  size = 16,
  color = palette.text,
  weight = 500,
  family = "Plus Jakarta Sans, Segoe UI, sans-serif",
  letter = 0,
}) {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="${family}" font-weight="${weight}" letter-spacing="${letter}">${esc(text)}</text>`;
}

function renderShot({ ratio, title, tab, leftItems, editorLines, previewTitle, previewLines, accent = "gold" }) {
  const { width, height } = ratioMap[ratio];
  const framePad = Math.round(width * 0.045);
  const frameW = width - framePad * 2;
  const frameH = height - framePad * 2;
  const barH = Math.round(frameH * 0.09);
  const contentY = framePad + barH;
  const contentH = frameH - barH;
  const sideW = Math.round(frameW * 0.18);
  const previewW = Math.round(frameW * 0.34);
  const editorW = frameW - sideW - previewW;
  const accentColor =
    accent === "blue" ? palette.accentBlue : accent === "rose" ? palette.accentRose : palette.accentGold;

  const sideItems = leftItems
    .map((item, index) =>
      svgText({
        x: framePad + 28,
        y: contentY + 44 + index * 34,
        text: item,
        size: 15,
        color: index === 0 ? palette.text : palette.muted,
      })
    )
    .join("");

  const codeLines = editorLines
    .map((line, index) =>
      svgText({
        x: framePad + sideW + 32,
        y: contentY + 52 + index * 34,
        text: line,
        size: 15,
        color: line.startsWith("#") ? accentColor : palette.text,
        family: "JetBrains Mono, Consolas, monospace",
      })
    )
    .join("");

  const previewTitleText = svgText({
    x: framePad + sideW + editorW + 24,
    y: contentY + 36,
    text: previewTitle,
    size: 15,
    color: palette.text,
    weight: 700,
  });

  const previewContent = previewLines
    .map((line, index) =>
      svgText({
        x: framePad + sideW + editorW + 24,
        y: contentY + 72 + index * 30,
        text: line,
        size: 14,
        color: index === 0 ? palette.text : palette.muted,
      })
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="${width}" y2="${height}">
      <stop offset="0%" stop-color="#101522"/>
      <stop offset="55%" stop-color="#0b0e14"/>
      <stop offset="100%" stop-color="#080b12"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect x="${framePad}" y="${framePad}" width="${frameW}" height="${frameH}" rx="18" fill="${palette.panel}" stroke="${palette.borderStrong}" />
  <rect x="${framePad}" y="${framePad}" width="${frameW}" height="${barH}" rx="18" fill="${palette.panelSoft}" />
  <rect x="${framePad}" y="${contentY}" width="${sideW}" height="${contentH}" fill="#111926" />
  <rect x="${framePad + sideW}" y="${contentY}" width="${editorW}" height="${contentH}" fill="#121a28" />
  <rect x="${framePad + sideW + editorW}" y="${contentY}" width="${previewW}" height="${contentH}" fill="#111925" />
  <line x1="${framePad + sideW}" y1="${contentY}" x2="${framePad + sideW}" y2="${contentY + contentH}" stroke="${palette.border}" />
  <line x1="${framePad + sideW + editorW}" y1="${contentY}" x2="${framePad + sideW + editorW}" y2="${contentY + contentH}" stroke="${palette.border}" />
  <circle cx="${framePad + 20}" cy="${framePad + 22}" r="6" fill="#f08f91"/>
  <circle cx="${framePad + 40}" cy="${framePad + 22}" r="6" fill="#e7be73"/>
  <circle cx="${framePad + 60}" cy="${framePad + 22}" r="6" fill="${palette.green}"/>
  ${svgText({ x: framePad + 92, y: framePad + 27, text: title, size: 15, color: palette.text, weight: 700 })}
  <rect x="${framePad + sideW + 22}" y="${framePad + 12}" width="${Math.max(
    320,
    tab.length * 10 + 80
  )}" height="34" rx="8" fill="rgba(126,167,255,0.12)" stroke="rgba(126,167,255,0.4)" />
  ${svgText({
    x: framePad + sideW + 42,
    y: framePad + 34,
    text: tab,
    size: 14,
    color: palette.accentBlue,
    family: "JetBrains Mono, Consolas, monospace",
  })}
  ${sideItems}
  ${codeLines}
  ${previewTitleText}
  ${previewContent}
</svg>`;
}

const localized = (pt, en, es) => ({ "pt-BR": pt, "en-US": en, "es-ES": es });

function buildEntries(fixtures) {
  return [
    {
      key: "home.hero",
      ratio: "16:10",
      source: "mock",
      alt: localized(
        "Mockup do editor Mark-Lee com painel lateral, abas e preview lado a lado.",
        "Mark-Lee editor mockup with sidebar, tabs, and side-by-side preview.",
        "Mockup del editor Mark-Lee con sidebar, pestanas y preview lado a lado."
      ),
      shot: fixtures.hero,
      accent: "gold",
    },
    {
      key: "home.capabilities.write",
      ratio: "4:3",
      source: "mock",
      alt: localized(
        "Mockup do fluxo de escrita focada com markdown e destaque de headings.",
        "Focused writing flow mockup with markdown and highlighted headings.",
        "Mockup de flujo de escritura enfocada con markdown y headings destacados."
      ),
      shot: { ...fixtures.hero, title: "Write / Focus", tab: "focused-writing.md" },
      accent: "blue",
    },
    {
      key: "home.capabilities.organize",
      ratio: "4:3",
      source: "mock",
      alt: localized(
        "Mockup de organizacao com workspace e navegacao de arquivos.",
        "Organization mockup with workspace and file navigation.",
        "Mockup de organizacion con workspace y navegacion de archivos."
      ),
      shot: { ...fixtures.hero, title: "Organize / Workspace", tab: "project-map.md" },
      accent: "gold",
    },
    {
      key: "home.capabilities.preview",
      ratio: "4:3",
      source: "mock",
      alt: localized(
        "Mockup de preview live mostrando documento renderizado.",
        "Live preview mockup showing rendered document output.",
        "Mockup de preview en vivo mostrando salida renderizada."
      ),
      shot: { ...fixtures.hero, title: "Preview / Live Render", tab: "preview-guide.md" },
      accent: "rose",
    },
    {
      key: "home.capabilities.export",
      ratio: "4:3",
      source: "mock",
      alt: localized(
        "Mockup de exportacao com painel de formatos e checklist de publicacao.",
        "Export mockup with format panel and publishing checklist.",
        "Mockup de exportacion con panel de formatos y checklist de publicacion."
      ),
      shot: { ...fixtures.hero, title: "Export / Multi-Format", tab: "publishing-checklist.md" },
      accent: "gold",
    },
    {
      key: "home.workflows.docs",
      ratio: "16:10",
      source: "mock",
      alt: localized(
        "Fluxo de documentacao tecnica no editor com markdown e preview.",
        "Technical documentation workflow in the editor with markdown and preview.",
        "Flujo de documentacion tecnica en el editor con markdown y preview."
      ),
      shot: {
        ...fixtures.workflows.docs,
        leftItems: fixtures.hero.leftItems,
        previewTitle: "Release notes preview",
      },
      accent: "blue",
    },
    {
      key: "home.workflows.meeting",
      ratio: "3:2",
      source: "mock",
      alt: localized(
        "Fluxo de notas de reuniao com tarefas e proximos passos.",
        "Meeting notes workflow with tasks and next steps.",
        "Flujo de notas de reunion con tareas y proximos pasos."
      ),
      shot: {
        ...fixtures.workflows.meeting,
        leftItems: fixtures.hero.leftItems,
        previewTitle: "Meeting summary",
      },
      accent: "rose",
    },
    {
      key: "home.workflows.publishing",
      ratio: "3:2",
      source: "mock",
      alt: localized(
        "Fluxo de publicacao com checklist para release e exportacao.",
        "Publishing workflow with release and export checklist.",
        "Flujo de publicacion con checklist para release y exportacion."
      ),
      shot: {
        ...fixtures.workflows.publishing,
        leftItems: fixtures.hero.leftItems,
        previewTitle: "Publishing status",
      },
      accent: "gold",
    },
    {
      key: "gallery.theme.golden",
      ratio: "16:10",
      source: "mock",
      alt: localized(
        "Mockup do tema Golden aplicado na interface de escrita.",
        "Golden theme mockup applied to the writing interface.",
        "Mockup del tema Golden aplicado en la interfaz de escritura."
      ),
      shot: { ...fixtures.hero, title: "Theme / Golden", tab: "golden-theme.md" },
      accent: "gold",
    },
    {
      key: "engineering.stack",
      ratio: "16:10",
      source: "mock",
      alt: localized(
        "Mockup tecnico com visao do stack e fluxo de build.",
        "Technical mockup showing stack and build workflow.",
        "Mockup tecnico mostrando stack y flujo de build."
      ),
      shot: { ...fixtures.hero, title: "Engineering / Stack", tab: "engineering-stack.md" },
      accent: "blue",
    },
    {
      key: "contributing.flow",
      ratio: "3:2",
      source: "mock",
      alt: localized(
        "Mockup de contribuicao com guia de branch, commits e pull request.",
        "Contribution mockup with branch, commits, and pull request guide.",
        "Mockup de contribucion con guia de branch, commits y pull request."
      ),
      shot: { ...fixtures.hero, title: "Contributing / Workflow", tab: "contributing.md" },
      accent: "rose",
    },
    {
      key: "faq.keyboard",
      ratio: "3:2",
      source: "mock",
      alt: localized(
        "Mockup de atalhos de teclado e ajuda rapida no editor.",
        "Keyboard shortcuts and quick help mockup inside the editor.",
        "Mockup de atajos de teclado y ayuda rapida dentro del editor."
      ),
      shot: { ...fixtures.hero, title: "FAQ / Keyboard Shortcuts", tab: "shortcuts.md" },
      accent: "blue",
    },
  ];
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const raw = await readFile(fixtureFile, "utf8");
  const fixtures = JSON.parse(raw);

  const entries = buildEntries(fixtures);
  const now = new Date().toISOString();

  const manifest = [];
  for (const entry of entries) {
    const fileName = `${entry.key.replaceAll(".", "-")}.svg`;
    const relPath = `assets/illustrations/${fileName}`;
    const absPath = path.join(outputDir, fileName);
    const svg = renderShot({
      ratio: entry.ratio,
      title: entry.shot.title,
      tab: entry.shot.tab,
      leftItems: entry.shot.leftItems,
      editorLines: entry.shot.editorLines,
      previewTitle: entry.shot.previewTitle,
      previewLines: entry.shot.previewLines,
      accent: entry.accent,
    });

    await writeFile(absPath, svg, "utf8");

    manifest.push({
      key: entry.key,
      source: entry.source,
      ratio: entry.ratio,
      path: relPath,
      alt: entry.alt,
      updatedAt: now,
      localeNeutral: true,
    });
  }

  await writeFile(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Generated ${manifest.length} mock illustrations.`);
}

main().catch((error) => {
  console.error("Failed to generate mock illustrations:", error);
  process.exit(1);
});
