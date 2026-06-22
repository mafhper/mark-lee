import { readFile, writeFile, openFileDialog } from "../../../services/filesystem";
import type { EntryRecord } from "./entry-service";
import { mdToHtml, wrapHtmlPage } from "./md-to-html";

export async function pickExportDirectory(): Promise<string | null> {
  const result = await openFileDialog({ directory: true, multiple: false, title: "Select export destination" });
  if (Array.isArray(result)) return result[0] ?? null;
  return result;
}

export function entryFileName(entry: EntryRecord): string {
  const parts = entry.path.split("/");
  return parts[parts.length - 1] ?? "entry.md";
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_");
}

export async function exportEntryAsMarkdown(entry: EntryRecord, destDir: string): Promise<string> {
  const filename = entryFileName(entry);
  const content = await readFile(entry.path);
  const destPath = `${destDir}/${filename}`;
  await writeFile(destPath, content);
  return destPath;
}

export async function exportEntryAsHtml(entry: EntryRecord, destDir: string): Promise<string> {
  const content = await readFile(entry.path);
  const bodyHtml = mdToHtml(content);
  const fullHtml = wrapHtmlPage(bodyHtml);
  const baseName = entryFileName(entry).replace(/\.md$/i, "");
  const destPath = `${destDir}/${baseName}.html`;
  await writeFile(destPath, fullHtml);
  return destPath;
}
