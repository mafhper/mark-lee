import { readFile, writeFile, createWorkspaceDirectory } from "../../../services/filesystem";
import type { JournalManifest } from "./journal.types";

const SCHEMA = "marklee-journal" as const;
const CURRENT_SCHEMA_VERSION = 1 as const;

export function createManifestPayload(
  id: string,
  name: string,
  description: string | undefined,
  defaultLanguage: string
): JournalManifest {
  return {
    schema: SCHEMA,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name,
    description,
    createdAt: new Date().toISOString(),
    entryDirectory: "entries",
    assetDirectory: "assets",
    defaultLanguage,
  };
}

function manifestPath(rootPath: string): string {
  return `${rootPath}/.marklee/journal.json`;
}

async function mkdirIfMissing(path: string): Promise<void> {
  try {
    await createWorkspaceDirectory(path);
  } catch {
    // directory may already exist
  }
}

export async function writeManifest(rootPath: string, manifest: JournalManifest): Promise<void> {
  await mkdirIfMissing(`${rootPath}/.marklee`);
  await writeFile(manifestPath(rootPath), JSON.stringify(manifest, null, 2));
}

export async function readManifest(rootPath: string): Promise<JournalManifest | null> {
  try {
    const raw = await readFile(manifestPath(rootPath));
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schema !== SCHEMA) return null;
    return parsed as JournalManifest;
  } catch {
    return null;
  }
}

export function validateManifest(data: unknown): data is JournalManifest {
  if (!data || typeof data !== "object") return false;
  const m = data as Record<string, unknown>;
  return (
    m.schema === SCHEMA &&
    typeof m.schemaVersion === "number" &&
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    typeof m.createdAt === "string" &&
    typeof m.entryDirectory === "string" &&
    typeof m.assetDirectory === "string"
  );
}

export function getSchemaVersion(manifest: JournalManifest): number {
  return manifest.schemaVersion;
}

export function isSchemaSupported(manifest: JournalManifest): boolean {
  return manifest.schemaVersion <= CURRENT_SCHEMA_VERSION;
}
