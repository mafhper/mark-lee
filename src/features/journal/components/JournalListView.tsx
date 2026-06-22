import { useState, useEffect, useMemo } from "react";
import { FileText, Heart, MapPin, Search } from "lucide-react";

const MOOD_EMOJI: Record<string, string> = {
  great: "\u{1F60A}",
  good: "\u{1F642}",
  neutral: "\u{1F610}",
  sad: "\u{1F622}",
  angry: "\u{1F624}",
  anxious: "\u{1F630}",
  tired: "\u{1F634}",
  loved: "\u{1F970}",
  thankful: "\u{1F64F}",
  creative: "\u{2728}",
  sick: "\u{1F912}",
  excited: "\u{1F929}",
};
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { listEntries, getExcerpt, searchEntries } from "../domain/entry-service";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalListViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  selectedEntryId: string | null;
  onSelectEntry: (entry: EntryRecord) => void;
  searchQuery?: string;
}

function groupByMonth(entries: EntryRecord[]): Map<string, EntryRecord[]> {
  const groups = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const d = new Date(entry.metadata.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return groups;
}

function monthLabel(key: string, locale: string): string {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(locale, { year: "numeric", month: "long" });
}

export function JournalListView({ t, tConfig, journal, selectedEntryId, onSelectEntry, searchQuery }: JournalListViewProps) {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);

  useEffect(() => {
    if (!journal) {
      setEntries([]);
      return;
    }
    setLoading(true);
    listEntries(journal.rootPath)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [journal?.rootPath]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const e of entries) {
      for (const t of e.metadata.tags) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [entries]);

  const searched = useMemo(() => searchEntries(entries, searchQuery ?? ""), [entries, searchQuery]);

  const filtered = useMemo(() => {
    let result = searched;
    if (filterTag) result = result.filter((e) => e.metadata.tags.includes(filterTag));
    if (filterFavorites) result = result.filter((e) => e.metadata.favorite);
    return result;
  }, [searched, filterTag, filterFavorites]);

  const hasActiveFilters = filterTag !== "" || filterFavorites;

  const today = new Date();
  const onThisDayEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.metadata.date);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() !== today.getFullYear();
    });
  }, [entries]);

  if (!journal) {
    return (
      <JournalEmptyState
        icon={<FileText size={36} />}
        title={t["journal.list"] || "List"}
        description={t["journal.noJournalDesc"] || "Select or create a journal to view entries."}
        tConfig={tConfig}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: tConfig.fgHex + "50" }}>
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <JournalEmptyState
        icon={<FileText size={36} />}
        title={t["journal.list"] || "Entries"}
        description={t["journal.emptyStateEntries"] || "No entries yet.\nClick \"New entry\" to start your journal."}
        tConfig={tConfig}
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-6" style={{ color: tConfig.fgHex + "60" }}>
        <Search size={28} style={{ color: tConfig.fgHex + "30" }} />
        <p className="text-xs text-center">{hasActiveFilters ? "No entries match filters" : `No entries match "${searchQuery}"`}</p>
      </div>
    );
  }

  const months = groupByMonth(filtered);

  const entryButton = (entry: EntryRecord) => (
    <button key={entry.metadata.id} type="button" onClick={() => onSelectEntry(entry)}
      className="w-full flex flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors border-b"
      style={{
        borderColor: tConfig.uiBorderHex,
        backgroundColor: selectedEntryId === entry.metadata.id ? tConfig.accentHex + "0C" : "transparent",
        borderLeft: selectedEntryId === entry.metadata.id ? `2px solid ${tConfig.accentHex}` : "2px solid transparent",
      }}>
      <div className="flex items-center gap-1.5 w-full min-w-0">
        <span className="text-[11px] font-medium shrink-0" style={{ color: tConfig.fgHex + "50" }}>
          {new Date(entry.metadata.date).getDate()}
        </span>
        {entry.metadata.mood && MOOD_EMOJI[entry.metadata.mood] && (
          <span className="text-sm shrink-0">{MOOD_EMOJI[entry.metadata.mood]}</span>
        )}
        <span className="text-sm font-medium truncate"
          style={{ color: selectedEntryId === entry.metadata.id ? tConfig.accentHex : tConfig.fgHex }}>
          {entry.metadata.title || "Untitled"}
        </span>
        {entry.metadata.favorite && (
          <Heart size={11} className="shrink-0" style={{ color: tConfig.accentHex }} />
        )}
      </div>
      {entry.metadata.summary && (
        <p className="text-xs truncate w-full" style={{ color: tConfig.fgHex + "60" }}>{entry.metadata.summary}</p>
      )}
      {!entry.metadata.summary && entry.body.trim() && (
        <p className="text-xs truncate w-full" style={{ color: tConfig.fgHex + "50" }}>{getExcerpt(entry.body, 80)}</p>
      )}
      <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: tConfig.fgHex + "40" }}>
        {entry.metadata.location && (
          <span className="flex items-center gap-0.5"><MapPin size={10} />{entry.metadata.location.label}</span>
        )}
        {entry.wordCount > 0 && <span>{entry.wordCount} words</span>}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap sticky top-0 z-10 border-b"
          style={{ backgroundColor: tConfig.uiHex, borderColor: tConfig.uiBorderHex }}>
          {allTags.map((tag) => (
            <button key={tag} type="button" onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
              className="px-1.5 py-0.5 rounded text-[11px] transition-colors"
              style={{
                backgroundColor: filterTag === tag ? tConfig.accentHex + "30" : tConfig.accentHex + "10",
                color: filterTag === tag ? tConfig.accentHex : tConfig.fgHex + "70",
              }}>
              {tag}
            </button>
          ))}
          <button type="button" onClick={() => setFilterFavorites(!filterFavorites)}
            className="px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors"
            style={{
              backgroundColor: filterFavorites ? tConfig.accentHex + "30" : "transparent",
              color: filterFavorites ? "#ef4444" : tConfig.fgHex + "60",
            }}>
            <Heart size={11} fill={filterFavorites ? "#ef4444" : "none"} />
            Favorites
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={() => { setFilterTag(""); setFilterFavorites(false); }}
              className="text-[10px] ml-1 underline" style={{ color: tConfig.fgHex + "50" }}>
              Clear
            </button>
          )}
        </div>
      )}

      {onThisDayEntries.length > 0 && !searchQuery && !hasActiveFilters && (
        <div>
          <div
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-10 border-b flex items-center gap-1.5"
            style={{
              backgroundColor: tConfig.uiHex,
              color: tConfig.accentHex,
              borderColor: tConfig.uiBorderHex,
            }}
          >
            <span>{"📅"}</span> On this day
          </div>
          {onThisDayEntries.map((entry) => entryButton(entry))}
        </div>
      )}

      {Array.from(months.entries()).map(([key, monthEntries]) => (
        <div key={key}>
          <div
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-10 border-b"
            style={{
              backgroundColor: tConfig.uiHex,
              color: tConfig.fgHex + "80",
              borderColor: tConfig.uiBorderHex,
            }}
          >
            {monthLabel(key, "en")}
          </div>
          {monthEntries.map((entry) => entryButton(entry))}
        </div>
      ))}
    </div>
  );
}
