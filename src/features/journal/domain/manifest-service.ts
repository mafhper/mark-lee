import { readFile, atomicWriteText, ensureDirectoryTree, copyImageToDocumentDir } from "../../../services/filesystem";
import type { BlogViewConfig, JournalManifest, ManifestCheckResult, JournalDescriptor, PinConfig, PinsConfig } from "./journal.types";

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

function pinFromLegacyId(id: string, order: number): PinConfig | null {
  const base = {
    id: crypto.randomUUID(),
    period: "month" as const,
    aggregation: "sum" as const,
    target: undefined,
    color: undefined,
    format: "value" as const,
    order,
    visible: true,
  };
  if (id === "metric:streak") return { ...base, source: "metric", metricId: "streak", label: "Streak", aggregation: "count" };
  if (id === "metric:words") return { ...base, source: "metric", metricId: "words", label: "Words" };
  if (id === "metric:entries") return { ...base, source: "metric", metricId: "entries", label: "Entries", aggregation: "count" };
  if (id.startsWith("tracker:")) {
    return { ...base, source: "tracker", trackerId: id.slice("tracker:".length), label: id.slice("tracker:".length), aggregation: "avg", format: "bar" };
  }
  return null;
}

function normalizePinsConfig(value: unknown, legacyPinned: unknown): PinsConfig | undefined {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const rawItems = Array.isArray(obj.items) ? obj.items : [];
    const items = rawItems
      .map((item, index): PinConfig | null => {
        if (!item || typeof item !== "object") return null;
        const raw = item as Record<string, unknown>;
        const source = raw.source === "metric" || raw.source === "tracker" ? raw.source : null;
        if (!source) return null;
        const period = raw.period === "day" || raw.period === "week" || raw.period === "month" || raw.period === "all" ? raw.period : "month";
        const aggregation =
          raw.aggregation === "sum" || raw.aggregation === "avg" || raw.aggregation === "min" ||
          raw.aggregation === "max" || raw.aggregation === "latest" || raw.aggregation === "count"
            ? raw.aggregation
            : source === "tracker" ? "avg" : "sum";
        const format = raw.format === "value" || raw.format === "bar" || raw.format === "sparkline" ? raw.format : "value";
        const metricId = raw.metricId === "streak" || raw.metricId === "words" || raw.metricId === "entries" ? raw.metricId : undefined;
        const trackerId = typeof raw.trackerId === "string" ? raw.trackerId : undefined;
        if (source === "metric" && !metricId) return null;
        if (source === "tracker" && !trackerId) return null;
        const target = Number(raw.target);
        const order = Number(raw.order);
        return {
          id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
          source,
          metricId,
          trackerId,
          label: typeof raw.label === "string" && raw.label.trim() ? raw.label : metricId ?? trackerId ?? "Pin",
          period,
          aggregation,
          target: Number.isFinite(target) && target > 0 ? target : undefined,
          color: typeof raw.color === "string" ? raw.color : undefined,
          format,
          order: Number.isFinite(order) ? order : index,
          visible: typeof raw.visible === "boolean" ? raw.visible : true,
        };
      })
      .filter((item): item is PinConfig => item !== null)
      .sort((a, b) => a.order - b.order);
    return { version: 1, items: items.map((item, index) => ({ ...item, order: index })) };
  }

  if (Array.isArray(legacyPinned)) {
    const items = legacyPinned
      .filter((m: unknown): m is string => typeof m === "string")
      .map((id, index) => pinFromLegacyId(id, index))
      .filter((item): item is PinConfig => item !== null);
    return { version: 1, items };
  }

  return undefined;
}

function normalizeBlogView(value: unknown): BlogViewConfig | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const theme = raw.theme === "paper" || raw.theme === "magazine" || raw.theme === "notebook" || raw.theme === "clean" ? raw.theme : "clean";
  const menu = Array.isArray(raw.menu)
    ? raw.menu
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          if (typeof row.label !== "string" || typeof row.href !== "string") return null;
          return { label: row.label, href: row.href };
        })
        .filter((item): item is { label: string; href: string } => item !== null)
    : [];
  return {
    version: 1,
    title: typeof raw.title === "string" ? raw.title : undefined,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : undefined,
    logo: typeof raw.logo === "string" ? raw.logo : undefined,
    theme,
    menu,
    showMeta: typeof raw.showMeta === "boolean" ? raw.showMeta : true,
    showLogo: typeof raw.showLogo === "boolean" ? raw.showLogo : true,
  };
}

async function mkdirIfMissing(path: string): Promise<void> {
  await ensureDirectoryTree(path);
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
      color: typeof parsed.color === "string" ? parsed.color : undefined,
      cover: typeof parsed.cover === "string" ? parsed.cover : undefined,
      pinnedMetrics: Array.isArray(parsed.pinnedMetrics)
        ? parsed.pinnedMetrics.filter((m: unknown): m is string => typeof m === "string")
        : undefined,
      pinsConfig: normalizePinsConfig(parsed.pinsConfig, parsed.pinnedMetrics),
      blogView: normalizeBlogView(parsed.blogView),
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

  // Create root directory and subdirectories (idempotent, creates parents as needed)
  await ensureDirectoryTree(rootPath);
  await ensureDirectoryTree(`${rootPath}/.marklee`);
  await ensureDirectoryTree(`${rootPath}/entries`);
  await ensureDirectoryTree(`${rootPath}/assets`);

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

/**
 * Patch a notebook's appearance (color/cover) on disk. Reads the raw manifest and
 * merges only the given keys, preserving every other field (including unknown
 * ones). Pass `null` to clear a field.
 */
export async function updateJournalAppearance(
  rootPath: string,
  patch: { name?: string; description?: string | null; color?: string | null; cover?: string | null },
): Promise<void> {
  const raw = await readFile(manifestPath(rootPath));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name) parsed.name = name;
  }
  if (patch.description !== undefined) {
    const description = patch.description?.trim();
    if (!description) delete parsed.description;
    else parsed.description = description;
  }
  if (patch.color !== undefined) {
    if (patch.color === null) delete parsed.color;
    else parsed.color = patch.color;
  }
  if (patch.cover !== undefined) {
    if (patch.cover === null) delete parsed.cover;
    else parsed.cover = patch.cover;
  }
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(parsed, null, 2));
}

/**
 * Rewrite the notebook's `id` on disk (preserving every other field). Used when a
 * notebook folder was copied — duplicating its id — so each copy gets a unique id.
 */
export async function updateManifestId(rootPath: string, id: string): Promise<void> {
  const raw = await readFile(manifestPath(rootPath));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.id = id;
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(parsed, null, 2));
}

/** Persist which Pins metrics are shown in the sidebar (preserves unknown fields). */
export async function setPinnedMetrics(rootPath: string, ids: string[]): Promise<void> {
  const raw = await readFile(manifestPath(rootPath));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.pinnedMetrics = ids;
  parsed.pinsConfig = normalizePinsConfig(undefined, ids);
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(parsed, null, 2));
}

export async function setPinsConfig(rootPath: string, config: PinsConfig): Promise<void> {
  const raw = await readFile(manifestPath(rootPath));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.pinsConfig = { version: 1, items: config.items.map((item, order) => ({ ...item, order })) };
  delete parsed.pinnedMetrics;
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(parsed, null, 2));
}

export async function setJournalInsights(
  rootPath: string,
  trackerDefinitions: JournalManifest["trackerDefinitions"],
  pinsConfig: PinsConfig,
): Promise<void> {
  const raw = await readFile(manifestPath(rootPath));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.trackerDefinitions = trackerDefinitions ?? [];
  parsed.pinsConfig = { version: 1, items: pinsConfig.items.map((item, order) => ({ ...item, order })) };
  delete parsed.pinnedMetrics;
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(parsed, null, 2));
}

export async function setBlogView(rootPath: string, blogView: BlogViewConfig): Promise<void> {
  const raw = await readFile(manifestPath(rootPath));
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.blogView = blogView;
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(parsed, null, 2));
}

/**
 * Copy an image into the notebook's `.marklee/` folder and set it as the cover.
 * Returns the root-relative cover path stored in the manifest.
 */
export async function setJournalCover(rootPath: string, imagePath: string): Promise<string> {
  await mkdirIfMissing(`${rootPath}/.marklee`);
  // copy_image_to_document_dir copies next to the given document path (i.e. into
  // `.marklee/`) and returns the sanitized filename relative to that folder.
  const fileName = await copyImageToDocumentDir(imagePath, `${rootPath}/.marklee/cover`);
  const cover = `.marklee/${fileName}`;
  await updateJournalAppearance(rootPath, { cover });
  return cover;
}

/**
 * Make a folder into a valid notebook **without touching its entries or assets**.
 * Salvages any readable fields from a broken/old/partial manifest, fills the rest
 * with valid defaults, ensures `.marklee`/`entries`/`assets` exist, and writes a
 * current-schema manifest. Use for "recreate"/"initialize" during import.
 */
export async function repairJournal(
  rootPath: string,
  opts: { name?: string; description?: string; language?: string; newId?: boolean } = {},
): Promise<JournalDescriptor> {
  let existing: Record<string, unknown> = {};
  try { existing = JSON.parse(await readFile(manifestPath(rootPath))) as Record<string, unknown>; } catch { existing = {}; }

  const existingId = typeof existing.id === "string" ? existing.id : "";
  const id = opts.newId || !existingId ? crypto.randomUUID() : existingId;

  const manifest: JournalManifest = {
    schema: SCHEMA,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: opts.name?.trim() || (typeof existing.name === "string" && existing.name) || "Caderno",
    description: opts.description ?? (typeof existing.description === "string" ? existing.description : undefined),
    createdAt: typeof existing.createdAt === "string" ? existing.createdAt : new Date().toISOString(),
    entryDirectory: "entries",
    assetDirectory: "assets",
    defaultLanguage: opts.language || (typeof existing.defaultLanguage === "string" ? existing.defaultLanguage : "en-US"),
    trackerDefinitions: Array.isArray(existing.trackerDefinitions) ? (existing.trackerDefinitions as JournalManifest["trackerDefinitions"]) : undefined,
    color: typeof existing.color === "string" ? existing.color : undefined,
    cover: typeof existing.cover === "string" ? existing.cover : undefined,
    pinnedMetrics: Array.isArray(existing.pinnedMetrics) ? (existing.pinnedMetrics as string[]).filter((m) => typeof m === "string") : undefined,
    pinsConfig: normalizePinsConfig(existing.pinsConfig, existing.pinnedMetrics),
    blogView: normalizeBlogView(existing.blogView),
  };

  await mkdirIfMissing(`${rootPath}/.marklee`);
  await mkdirIfMissing(`${rootPath}/entries`);
  await mkdirIfMissing(`${rootPath}/assets`);
  await atomicWriteText(manifestPath(rootPath), JSON.stringify(manifest, null, 2));

  return {
    id: manifest.id,
    name: manifest.name,
    rootPath,
    description: manifest.description,
    schemaVersion: manifest.schemaVersion,
    createdAt: manifest.createdAt,
    color: manifest.color,
    cover: manifest.cover,
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
