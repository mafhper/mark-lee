import { readFile, writeFile, createWorkspaceDirectory, listDir, deleteWorkspacePath } from "../../../services/filesystem";
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

  return { path, metadata, body, wordCount: 0 };
}

export async function readEntry(path: string): Promise<EntryRecord | null> {
  try {
    const raw = await readFile(path);
    const result = parseJournalEntry(raw);
    if ("error" in result) return null;
    const wordCount = result.body.trim() ? result.body.trim().split(/\s+/).length : 0;
    return { path, metadata: result.metadata, body: result.body, wordCount };
  } catch {
    return null;
  }
}

export async function saveEntry(path: string, metadata: JournalEntryMetadata, body: string): Promise<void> {
  const updated: JournalEntryMetadata = {
    ...metadata,
    updatedAt: new Date().toISOString(),
  };
  const content = serializeJournalEntry(updated, body);
  await writeFile(path, content);
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

export async function listEntries(journalRoot: string): Promise<EntryRecord[]> {
  const entriesDir = `${journalRoot}/entries/`;
  const filePaths = await collectEntriesRecursive(entriesDir, entriesDir);

  const records: EntryRecord[] = [];
  for (const path of filePaths) {
    const record = await readEntry(path);
    if (record) records.push(record);
  }

  // Sort by date descending (newest first)
  records.sort((a, b) => {
    const da = new Date(a.metadata.date).getTime();
    const db = new Date(b.metadata.date).getTime();
    return db - da;
  });

  return records;
}

export function getExcerpt(body: string, maxLength = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

export async function deleteEntry(path: string): Promise<void> {
  await deleteWorkspacePath(path);
}
