import { getFileMetadata, readFile, writeFile, createWorkspaceDirectory, listDir, deleteWorkspacePath } from "../../../services/filesystem";
import { parseJournalEntry } from "./journal-entry.parser";
import { serializeJournalEntry } from "./journal-entry.serializer";
import type { JournalEntryMetadata } from "./journal-entry.types";

const SCHEMA = "marklee-entry" as const;
const SCHEMA_VERSION = 1 as const;

export interface EntryRecord {
  path: string;
  metadata: JournalEntryMetadata;
  body: string;
  wordCount: number;
}

export class ConflictError extends Error {
  constructor(public readonly path: string) {
    super(`External conflict detected: ${path} was modified outside the app`);
    this.name = "ConflictError";
  }
}

const lastMtimes = new Map<string, number>();

function getStoredMtime(path: string): number | undefined {
  return lastMtimes.get(path);
}

function setStoredMtime(path: string, mtime: number): void {
  lastMtimes.set(path, mtime);
}

async function captureMtime(path: string): Promise<number> {
  try {
    const meta = await getFileMetadata(path);
    return meta.mtime;
  } catch {
    return 0;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function entryPath(journalRoot: string, date: Date, id: string): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const filename = `${y}-${m}-${d}--${hh}${mm}${ss}--${id}.md`;
  return `${journalRoot}/entries/${y}/${m}/${filename}`;
}

export async function createEntry(
  journalRoot: string,
  title: string,
  date: Date,
  tags: string[] = [],
): Promise<EntryRecord> {
  const id = crypto.randomUUID();
  const path = entryPath(journalRoot, date, id);
  const now = new Date().toISOString();
  const entryDate = date.toISOString();

  const metadata: JournalEntryMetadata = {
    schema: SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    id,
    date: entryDate,
    title: title || "Untitled",
    tags,
    createdAt: now,
    updatedAt: now,
  };

  const body = "";
  const content = serializeJournalEntry(metadata, body);

  // Ensure directory exists
  const dir = path.substring(0, path.lastIndexOf("/"));
  await createWorkspaceDirectory(dir);

  await writeFile(path, content);

  const newMtime = await captureMtime(path);
  if (newMtime) setStoredMtime(path, newMtime);

  return { path, metadata, body, wordCount: 0 };
}

export async function readEntry(path: string): Promise<EntryRecord | null> {
  try {
    const raw = await readFile(path);
    const result = parseJournalEntry(raw);
    if ("error" in result) return null;
    const wordCount = result.body.trim() ? result.body.trim().split(/\s+/).length : 0;
    const mtime = await captureMtime(path);
    if (mtime) setStoredMtime(path, mtime);
    return { path, metadata: result.metadata, body: result.body, wordCount };
  } catch {
    return null;
  }
}

export async function saveEntry(path: string, metadata: JournalEntryMetadata, body: string, force = false): Promise<void> {
  if (!force) {
    const beforeMtime = await captureMtime(path);
    const stored = getStoredMtime(path);
    if (stored !== undefined && beforeMtime !== 0 && beforeMtime !== stored) {
      throw new ConflictError(path);
    }
  }
  const updated: JournalEntryMetadata = {
    ...metadata,
    updatedAt: new Date().toISOString(),
  };
  const content = serializeJournalEntry(updated, body);
  await writeFile(path, content);
  // update stored mtime after write
  const afterMtime = await captureMtime(path);
  if (afterMtime) setStoredMtime(path, afterMtime);
}

async function collectEntriesRecursive(baseDir: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  try {
    const items = await listDir(baseDir);
    for (const item of items) {
      const fullPath = `${prefix}${item}`;
      if (item.endsWith("/")) {
        const subPaths = await collectEntriesRecursive(`${baseDir}${item}`, `${prefix}${item}`);
        paths.push(...subPaths);
      } else if (item.endsWith(".md")) {
        paths.push(fullPath);
      }
    }
  } catch {
    // directory may not exist
  }
  return paths;
}

export interface ListEntriesResult {
  entries: EntryRecord[];
  errors: { path: string; error: string }[];
}

export async function listEntries(
  journalRoot: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ListEntriesResult> {
  const entriesDir = `${journalRoot}/entries/`;
  const filePaths = await collectEntriesRecursive(entriesDir, entriesDir);

  const records: EntryRecord[] = [];
  const errors: { path: string; error: string }[] = [];
  const total = filePaths.length;

  for (let i = 0; i < total; i++) {
    const path = filePaths[i];
    try {
      const record = await readEntry(path);
      if (record) records.push(record);
    } catch (e) {
      errors.push({ path, error: e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(i + 1, total);
  }

  // Sort by date descending (newest first)
  records.sort((a, b) => {
    const da = new Date(a.metadata.date).getTime();
    const db = new Date(b.metadata.date).getTime();
    return db - da;
  });

  return { entries: records, errors };
}

export function searchEntries(entries: EntryRecord[], query: string): EntryRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    if (e.metadata.title.toLowerCase().includes(q)) return true;
    if (e.body.toLowerCase().includes(q)) return true;
    if (e.metadata.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
    return false;
  });
}

export function getExcerpt(body: string, maxLength = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

export async function duplicateEntry(
  journalRoot: string,
  source: EntryRecord,
  date?: Date,
): Promise<EntryRecord> {
  const targetDate = date ?? new Date(source.metadata.date);
  const id = crypto.randomUUID();
  const path = entryPath(journalRoot, targetDate, id);
  const now = new Date().toISOString();

  const metadata: JournalEntryMetadata = {
    ...source.metadata,
    id,
    date: targetDate.toISOString(),
    createdAt: now,
    updatedAt: now,
  };

  const content = serializeJournalEntry(metadata, source.body);

  const dir = path.substring(0, path.lastIndexOf("/"));
  await createWorkspaceDirectory(dir);
  await writeFile(path, content);

  const dupMtime = await captureMtime(path);
  if (dupMtime) setStoredMtime(path, dupMtime);

  return { path, metadata, body: source.body, wordCount: source.wordCount };
}

export async function deleteEntry(path: string): Promise<void> {
  await deleteWorkspacePath(path);
}
