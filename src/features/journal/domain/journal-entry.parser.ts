import YAML from "yaml";
import type { JournalEntryMetadata } from "./journal-entry.types";

const KNOWN_KEYS = new Set([
  "schema", "schemaVersion", "id", "date", "title", "summary", "tags", "mood",
  "trackers", "location", "cover", "favorite", "attachments", "createdAt", "updatedAt",
]);

export interface ParseResult {
  metadata: JournalEntryMetadata;
  body: string;
}

export interface ParseError {
  error: string;
  line?: number;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n*/;

export function parseJournalEntry(raw: string): ParseResult | ParseError {
  // Normalize line endings first. Entry files authored on Windows (CRLF) or old
  // Mac (CR) would otherwise fail the LF-only frontmatter match and load as 0
  // entries with no error — a silent import failure.
  const normalized = raw.replace(/\r\n?/g, "\n");
  const match = normalized.match(FRONTMATTER_RE);
  if (!match) {
    return { error: "No frontmatter block found." };
  }

  const yamlBlock = match[1];
  const body = normalized.slice(match[0].length);

  let parsed: unknown;
  try {
    parsed = YAML.parse(yamlBlock);
  } catch (e) {
    const yamlErr = e as { linePos?: Array<{ line: number }> };
    return {
      error: e instanceof Error ? e.message : "YAML parse error.",
      line: yamlErr?.linePos?.[0]?.line,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return { error: "Frontmatter is not a valid object." };
  }

  const fm = parsed as Record<string, unknown>;

  if (fm.schema !== "marklee-entry") {
    return { error: `Unknown schema: "${fm.schema}".` };
  }

  const metadata: JournalEntryMetadata = {
    schema: "marklee-entry",
    schemaVersion: typeof fm.schemaVersion === "number" ? fm.schemaVersion : 1,
    id: String(fm.id ?? ""),
    date: String(fm.date ?? ""),
    title: String(fm.title ?? ""),
    summary: typeof fm.summary === "string" ? fm.summary : undefined,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    mood: typeof fm.mood === "string" ? fm.mood : undefined,
    trackers: fm.trackers && typeof fm.trackers === "object" ? fm.trackers as Record<string, string | number | boolean | null> : undefined,
    location: fm.location && typeof fm.location === "object"
      ? {
          label: String((fm.location as Record<string, unknown>).label ?? ""),
          latitude: typeof (fm.location as Record<string, unknown>).latitude === "number"
            ? (fm.location as Record<string, unknown>).latitude as number : undefined,
          longitude: typeof (fm.location as Record<string, unknown>).longitude === "number"
            ? (fm.location as Record<string, unknown>).longitude as number : undefined,
          source: (fm.location as Record<string, unknown>).source as "manual" | "device" | "search" | undefined,
          city: typeof (fm.location as Record<string, unknown>).city === "string"
            ? (fm.location as Record<string, unknown>).city as string : undefined,
          state: typeof (fm.location as Record<string, unknown>).state === "string"
            ? (fm.location as Record<string, unknown>).state as string : undefined,
          country: typeof (fm.location as Record<string, unknown>).country === "string"
            ? (fm.location as Record<string, unknown>).country as string : undefined,
          attraction: typeof (fm.location as Record<string, unknown>).attraction === "string"
            ? (fm.location as Record<string, unknown>).attraction as string : undefined,
        }
      : undefined,
    cover: typeof fm.cover === "string" ? fm.cover : undefined,
    favorite: typeof fm.favorite === "boolean" ? fm.favorite : false,
    attachments: Array.isArray(fm.attachments) ? fm.attachments.map(String) : undefined,
    createdAt: String(fm.createdAt ?? new Date().toISOString()),
    updatedAt: String(fm.updatedAt ?? new Date().toISOString()),
  };

  const extraFrontmatter: Record<string, unknown> = {};
  for (const key of Object.keys(fm)) {
    if (!KNOWN_KEYS.has(key)) {
      extraFrontmatter[key] = fm[key];
    }
  }
  if (Object.keys(extraFrontmatter).length > 0) {
    metadata.extraFrontmatter = extraFrontmatter;
  }

  return { metadata, body };
}
