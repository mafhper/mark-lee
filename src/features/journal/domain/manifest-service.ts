import { readFile, atomicWriteText, createWorkspaceDirectory } from "../../../services/filesystem";
import type { JournalManifest, ManifestCheckResult, JournalDescriptor } from "./journal.types";

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

export async function checkManifest(rootPath: string): Promise<ManifestCheckResult> {
  try {
    const raw = await readFile(manifestPath(rootPath));
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return { found: true, valid: false, error: "Manifest is not a valid JSON object." };
    }

    if (parsed.schema !== SCHEMA) {
      return { found: true, valid: false, error: `Unknown schema: "${parsed.schema}". Expected "${SCHEMA}".` };
    }

    if (typeof parsed.schemaVersion !== "number") {
      return { found: true, valid: false, error: "Missing or invalid schemaVersion." };
    }

    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return {
        found: true,
        valid: false,
        error: `Schema version ${parsed.schemaVersion} is newer than supported (${CURRENT_SCHEMA_VERSION}). Please update Mark-Lee.`,
      };
    }

    if (!parsed.id || typeof parsed.id !== "string") {
      return { found: true, valid: false, error: "Missing journal id." };
    }

    if (!parsed.name || typeof parsed.name !== "string") {
      return { found: true, valid: false, error: "Missing journal name." };
    }

    const trackerDefinitions = Array.isArray(parsed.trackerDefinitions)
      ? parsed.trackerDefinitions.filter(
          (d: unknown) => d && typeof d === "object" && typeof (d as Record<string, unknown>).id === "string"
        )
      : undefined;

    const manifest: JournalManifest = {
      schema: SCHEMA,
      schemaVersion: parsed.schemaVersion,
      id: parsed.id,
      name: parsed.name,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      createdAt: parsed.createdAt || new Date().toISOString(),
      entryDirectory: parsed.entryDirectory || "entries",
      assetDirectory: parsed.assetDirectory || "assets",
      defaultLanguage: parsed.defaultLanguage || "en-US",
      trackerDefinitions,
    };

    return { found: true, valid: true, manifest };
  } catch {
    return { found: false, valid: false, error: "No journal manifest found in this folder." };
  }
}

export async function writeManifest(rootPath: string, manifest: JournalManifest): Promise<void> {
  await mkdirIfMissing(`${rootPath}/.marklee`);
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(manifest, null, 2));
}

export async function createJournal(
  rootPath: string,
  name: string,
  description: string | undefined,
  defaultLanguage: string,
): Promise<JournalDescriptor> {
  const id = crypto.randomUUID();
  const manifest = createManifestPayload(id, name, description, defaultLanguage);

  // Create root directory and subdirectories
  try { await createWorkspaceDirectory(rootPath); } catch { /* may already exist */ }
  await createWorkspaceDirectory(`${rootPath}/.marklee`);
  await createWorkspaceDirectory(`${rootPath}/entries`);
  await createWorkspaceDirectory(`${rootPath}/assets`);

  // Write manifest atomically
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(manifest, null, 2));

  return {
    id: manifest.id,
    name: manifest.name,
    rootPath,
    description: manifest.description,
    schemaVersion: manifest.schemaVersion,
    createdAt: manifest.createdAt,
  };
}

export async function readManifest(rootPath: string): Promise<JournalManifest | null> {
  const result = await checkManifest(rootPath);
  return result.manifest ?? null;
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
