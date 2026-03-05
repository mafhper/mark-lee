import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");
const source = path.join(distDir, "index.html");
const fallback = path.join(distDir, "404.html");

const staticRoutes = [
  "pt-BR",
  "pt-BR/galeria",
  "pt-BR/engenharia",
  "pt-BR/contribuir",
  "pt-BR/faq",
  "pt-BR/downloads",
  "en-US",
  "en-US/gallery",
  "en-US/engineering",
  "en-US/contributing",
  "en-US/faq",
  "en-US/downloads",
  "es-ES",
  "es-ES/galeria",
  "es-ES/ingenieria",
  "es-ES/contribuir",
  "es-ES/faq",
  "es-ES/downloads",
];

await copyFile(source, fallback);

for (const route of staticRoutes) {
  const routeDir = path.join(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await copyFile(source, path.join(routeDir, "index.html"));
}

console.log("Copied dist/index.html -> dist/404.html and generated static route entries.");
