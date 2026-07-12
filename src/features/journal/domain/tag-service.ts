import type { JournalDescriptor } from "./journal.types";
import type { EntryRecord } from "./entry-service";

export interface TagStat {
  tag: string;
  count: number;
  source: "active" | "library";
}

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "");
}

export function filterEntriesByTags(entries: EntryRecord[], tags: string[]): EntryRecord[] {
  const requested = tags.map(normalizeTag).filter(Boolean);
  if (requested.length === 0) return entries;
  return entries.filter((entry) => requested.every((tag) => entry.metadata.tags.includes(tag)));
}

export function collectTagStats(entries: EntryRecord[], source: TagStat["source"] = "active"): TagStat[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const rawTag of entry.metadata.tags) {
      const tag = normalizeTag(rawTag);
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count, source }));
}

export function mergeTagStats(active: TagStat[], library: TagStat[]): TagStat[] {
  const merged = new Map<string, TagStat>();
  for (const stat of [...library, ...active]) {
    const previous = merged.get(stat.tag);
    merged.set(stat.tag, {
      tag: stat.tag,
      count: (previous?.count ?? 0) + stat.count,
      source: stat.source === "active" || previous?.source === "active" ? "active" : "library",
    });
  }
  return Array.from(merged.values()).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function collectLibraryTagStats(journals: JournalDescriptor[]): Promise<TagStat[]> {
  const { listEntries } = await import("./entry-service.ts");
  const rows: TagStat[] = [];
  for (const journal of journals) {
    if (journal.unavailable) continue;
    try {
      const result = await listEntries(journal.rootPath);
      rows.push(...collectTagStats(result.entries, "library"));
    } catch {
      /* Ignore unavailable or malformed notebooks while building suggestions. */
    }
  }
  return mergeTagStats([], rows);
}
