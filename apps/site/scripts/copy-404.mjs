import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");
const sourcePath = path.join(distDir, "index.html");
const metaPath = path.resolve(process.cwd(), "src", "i18n", "meta.json");
const sourceHtml = await readFile(sourcePath, "utf8");
const metadata = JSON.parse(await readFile(metaPath, "utf8"));

const staticRoutes = [
  ["pt-BR", "home"],
  ["pt-BR/galeria", "gallery"],
  ["pt-BR/engenharia", "engineering"],
  ["pt-BR/contribuir", "contributing"],
  ["pt-BR/faq", "faq"],
  ["pt-BR/downloads", "downloads"],
  ["en-US", "home"],
  ["en-US/gallery", "gallery"],
  ["en-US/engineering", "engineering"],
  ["en-US/contributing", "contributing"],
  ["en-US/faq", "faq"],
  ["en-US/downloads", "downloads"],
  ["es-ES", "home"],
  ["es-ES/galeria", "gallery"],
  ["es-ES/ingenieria", "engineering"],
  ["es-ES/contribuir", "contributing"],
  ["es-ES/faq", "faq"],
  ["es-ES/downloads", "downloads"],
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function withMetadata(html, locale, page) {
  const meta = metadata[locale][page];
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  return html
    .replace(/<html lang="[^"]*">/, `<html lang="${locale}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:locale" content="[^"]*" \/>/, `<meta property="og:locale" content="${locale.replace("-", "_")}" />`);
}

await writeFile(path.join(distDir, "404.html"), sourceHtml);
await writeFile(sourcePath, withMetadata(sourceHtml, "pt-BR", "home"));

for (const [route, page] of staticRoutes) {
  const locale = route.split("/")[0];
  const routeDir = path.join(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "index.html"), withMetadata(sourceHtml, locale, page));
}

console.log("Generated localized static route entries and SPA fallback.");
