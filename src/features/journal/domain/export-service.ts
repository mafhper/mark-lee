import { readFile, readBinaryFile, writeFile, writeBinaryFile, openFileDialog, createWorkspaceDirectory } from "../../../services/filesystem";
import type { EntryRecord } from "./entry-service";
import { listEntries } from "./entry-service";
import { mdToHtml, wrapHtmlPage } from "./md-to-html";
import JSZip from "jszip";

function collectImageRefs(body: string): string[] {
  const refs: string[] = [];
  const regex = /!\[.*?\]\((.+?)\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    const path = m[1];
    if (!/^(https?:\/|data:)/.test(path)) refs.push(path);
  }
  return refs;
}

async function copyImageToDir(imageRelPath: string, entryDir: string, destDir: string): Promise<void> {
  const srcPath = `${entryDir}/${imageRelPath}`;
  const destPath = `${destDir}/${imageRelPath}`;
  const imgParent = destPath.substring(0, destPath.lastIndexOf("/"));
  try { await createWorkspaceDirectory(imgParent); } catch { /* may already exist */ }
  const data = await readBinaryFile(srcPath);
  await writeBinaryFile(destPath, data);
}

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
  const entryDir = entry.path.substring(0, entry.path.lastIndexOf("/"));
  for (const img of collectImageRefs(entry.body)) {
    try { await copyImageToDir(img, entryDir, destDir); } catch { /* skip missing */ }
  }
  return destPath;
}

export async function exportEntryAsHtml(entry: EntryRecord, destDir: string): Promise<string> {
  const bodyHtml = mdToHtml(entry.body);
  const fullHtml = wrapHtmlPage(bodyHtml);
  const baseName = entryFileName(entry).replace(/\.md$/i, "");
  const destPath = `${destDir}/${baseName}.html`;
  await writeFile(destPath, fullHtml);
  await copyEntryAssets(entry, destDir);
  return destPath;
}

async function copyEntryAssets(entry: EntryRecord, destDir: string): Promise<void> {
  const entryDir = entry.path.substring(0, entry.path.lastIndexOf("/"));
  for (const img of collectImageRefs(entry.body)) {
    try { await copyImageToDir(img, entryDir, destDir); } catch { /* skip missing */ }
  }
  if (entry.metadata.cover) {
    try {
      const coverDir = entry.metadata.cover.includes("/")
        ? `${destDir}/${entry.metadata.cover.substring(0, entry.metadata.cover.lastIndexOf("/"))}`
        : destDir;
      try { await createWorkspaceDirectory(coverDir); } catch { /* may already exist */ }
      const data = await readBinaryFile(`${entryDir}/${entry.metadata.cover}`);
      await writeBinaryFile(`${destDir}/${entry.metadata.cover}`, data);
    } catch { /* skip missing cover */ }
  }
}

export interface ExportRangeResult {
  exported: number;
  errors: { path: string; error: string }[];
}

export async function exportDateRange(
  journalRoot: string,
  fromDate: string,
  toDate: string,
  destDir: string,
  format: "markdown" | "html" = "markdown",
  onProgress?: (done: number, total: number) => void,
): Promise<ExportRangeResult> {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  const all = await listEntries(journalRoot);

  const inRange = all.entries.filter((e) => {
    const d = new Date(e.metadata.date);
    return d >= from && d <= to;
  });

  // Sort by date ascending
  inRange.sort((a, b) => new Date(a.metadata.date).getTime() - new Date(b.metadata.date).getTime());

  const errors: { path: string; error: string }[] = [];
  let exported = 0;

  for (let i = 0; i < inRange.length; i++) {
    const entry = inRange[i];
    try {
      if (format === "html") {
        await exportEntryAsHtml(entry, destDir);
      } else {
        await exportEntryAsMarkdown(entry, destDir);
      }
      exported++;
    } catch (e) {
      errors.push({ path: entry.path, error: e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(i + 1, inRange.length);
  }

  return { exported, errors };
}

export async function exportJournal(
  journalRoot: string,
  destDir: string,
  format: "markdown" | "html" = "markdown",
  onProgress?: (done: number, total: number) => void,
): Promise<ExportRangeResult> {
  const all = await listEntries(journalRoot);
  const entries = all.entries;
  entries.sort((a, b) => new Date(a.metadata.date).getTime() - new Date(b.metadata.date).getTime());

  const errors: { path: string; error: string }[] = [];
  let exported = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      // Preserve relative path from entries/
      const rel = entry.path.startsWith(journalRoot + "/entries/")
        ? entry.path.slice((journalRoot + "/entries/").length)
        : entryFileName(entry);
      const relDir = rel.includes("/") ? rel.substring(0, rel.lastIndexOf("/")) : "";
      if (relDir) {
        await createWorkspaceDirectory(`${destDir}/entries/${relDir}`);
      }

      if (format === "html") {
        const bodyHtml = mdToHtml(entry.body);
        const fullHtml = wrapHtmlPage(bodyHtml);
        const baseName = entryFileName(entry).replace(/\.md$/i, "");
        await writeFile(`${destDir}/entries/${relDir}/${baseName}.html`, fullHtml);
        await copyEntryAssets(entry, `${destDir}/entries/${relDir}`);
      } else {
        const content = await readFile(entry.path);
        await writeFile(`${destDir}/entries/${rel}`, content);
        const entryDir = entry.path.substring(0, entry.path.lastIndexOf("/"));
        for (const img of collectImageRefs(entry.body)) {
          try { await copyImageToDir(img, entryDir, `${destDir}/entries/${relDir}`); } catch { /* skip missing */ }
        }
      }
      exported++;
    } catch (e) {
      errors.push({ path: entry.path, error: e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(i + 1, entries.length);
  }

  return { exported, errors };
}

export async function exportJournalAsZip(
  journalRoot: string,
  destPath: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ExportRangeResult> {
  const all = await listEntries(journalRoot);
  const entries = all.entries;
  entries.sort((a, b) => new Date(a.metadata.date).getTime() - new Date(b.metadata.date).getTime());

  const errors: { path: string; error: string }[] = [];
  const zip = new JSZip();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      const rel = entry.path.startsWith(journalRoot + "/entries/")
        ? entry.path.slice((journalRoot + "/entries/").length)
        : entryFileName(entry);
      const content = await readFile(entry.path);
      zip.file(`entries/${rel}`, content);

      const entryDir = entry.path.substring(0, entry.path.lastIndexOf("/"));
      const imgRegex = /!\[.*?\]\((.+?)\)/g;
      let m: RegExpExecArray | null;
      while ((m = imgRegex.exec(entry.body)) !== null) {
        const imgRel = m[1];
        if (/^(https?:\/|data:)/.test(imgRel)) continue;
        try {
          const imgContent = await readBinaryFile(`${entryDir}/${imgRel}`);
          zip.file(`entries/${rel.replace(/[^/]+$/, "")}${imgRel}`, imgContent);
        } catch {
          // skip missing images
        }
      }

      if (entry.metadata.cover) {
        try {
          const coverContent = await readBinaryFile(`${entryDir}/${entry.metadata.cover}`);
          zip.file(`entries/${rel.replace(/[^/]+$/, "")}${entry.metadata.cover}`, coverContent);
        } catch {
          // skip missing cover
        }
      }
    } catch (e) {
      errors.push({ path: entry.path, error: e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(i + 1, entries.length);
  }

  try {
    const manifestContent = await readFile(`${journalRoot}/.marklee/journal.json`);
    zip.file(".marklee/journal.json", manifestContent);
  } catch { /* manifest missing */ }

  try {
    const zipData = await zip.generateAsync({ type: "uint8array" });
    await writeBinaryFile(destPath, zipData);
  } catch (e) {
    errors.push({ path: destPath, error: e instanceof Error ? e.message : String(e) });
  }

  return { exported: entries.length - errors.length, errors };
}
