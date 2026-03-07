import { PUBLICATION_PRESET_DEFAULTS, SNIPPETS } from "../constants";
import { PublicationPreset, Snippet } from "../types";
import { readUserDataFile, writeUserDataFile } from "./filesystem";
import { migratePublicationPreset } from "./publication-style";

const SNIPPETS_FILE = "snippets.json";
const PRESETS_FILE = "publication-presets.json";

function normalizeSnippetToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function migrateSnippet(raw: Partial<Snippet>): Snippet {
  const fallbackName = (raw.name || "Snippet").trim() || "Snippet";
  const fallbackTrigger =
    normalizeSnippetToken(raw.trigger || raw.name || raw.id || "snippet") || "snippet";

  return {
    id: raw.id || crypto.randomUUID(),
    name: fallbackName,
    category: (raw.category || "general").trim() || "general",
    trigger: fallbackTrigger,
    icon: raw.icon || "SN",
    content: raw.content || "",
  };
}

export async function loadSnippets(): Promise<Snippet[]> {
  try {
    const raw = await readUserDataFile(SNIPPETS_FILE);
    if (!raw) return SNIPPETS.map((snippet) => migrateSnippet(snippet));
    const parsed = JSON.parse(raw) as Array<Partial<Snippet>>;
    const migrated = parsed.map((snippet) => migrateSnippet(snippet));
    return migrated.length > 0 ? migrated : SNIPPETS.map((snippet) => migrateSnippet(snippet));
  } catch {
    return SNIPPETS.map((snippet) => migrateSnippet(snippet));
  }
}

export async function saveSnippets(snippets: Snippet[]): Promise<void> {
  await writeUserDataFile(SNIPPETS_FILE, JSON.stringify(snippets, null, 2));
}

export async function loadPublicationPresets(): Promise<PublicationPreset[]> {
  try {
    const raw = await readUserDataFile(PRESETS_FILE);
    if (!raw) return PUBLICATION_PRESET_DEFAULTS.map((preset) => migratePublicationPreset(preset));
    const parsed = JSON.parse(raw) as PublicationPreset[];
    const migrated = parsed.map((preset) => migratePublicationPreset(preset));
    return migrated.length > 0 ? migrated : PUBLICATION_PRESET_DEFAULTS.map((preset) => migratePublicationPreset(preset));
  } catch {
    return PUBLICATION_PRESET_DEFAULTS.map((preset) => migratePublicationPreset(preset));
  }
}

export async function savePublicationPresets(presets: PublicationPreset[]): Promise<void> {
  await writeUserDataFile(PRESETS_FILE, JSON.stringify(presets, null, 2));
}
