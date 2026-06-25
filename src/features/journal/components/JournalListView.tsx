import { useState, useMemo, useEffect, useRef } from "react";
import { FileText, Heart, HeartOff, MapPin, Image as ImageIcon, Search, ChevronDown, ChevronRight, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useContextMenu, type ContextMenuEntry } from "../../../app/components/context-menu";
import { MOOD_EMOJI } from "../domain/moods";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { getExcerpt, searchEntries } from "../domain/entry-service";
import { JournalEmptyState } from "./JournalEmptyState";
import { loadImage } from "../../../services/filesystem";

interface JournalListViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entries: EntryRecord[];
  activeSection: string;
  selectedEntryId: string | null;
  onSelectEntry: (entry: EntryRecord) => void;
  onToggleFavorite?: (entry: EntryRecord) => void;
  onDuplicateEntry?: (entry: EntryRecord) => void;
  onDeleteEntry?: (entry: EntryRecord) => void;
  onOpenInEditor?: (path: string) => void;
  searchQuery?: string;
  language?: string;
  /** Controlled tag filter (lifted to the workspace so the reading view's
   *  clickable tags can drive it). */
  filterTag?: string;
  onFilterTagChange?: (tag: string) => void;
  filterImages?: boolean;
  onFilterImagesChange?: (value: boolean) => void;
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

function CoverThumb({ entryPath, cover, tConfig }: { entryPath: string; cover: string; tConfig: ThemeConfig }) {
  const [url, setUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    const dir = entryPath.substring(0, entryPath.lastIndexOf("/"));
    loadImage(dir + "/" + cover).then(setUrl).catch(() => setUrl(null));
    return () => { mountedRef.current = false; };
  }, [entryPath, cover]);
  if (!url) return null;
  return (
    <div className="w-10 h-10 rounded overflow-hidden shrink-0 mt-0.5"
      style={{ backgroundColor: tConfig.accentHex + "10" }}>
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

export function JournalListView({ t, tConfig, journal, entries, activeSection, selectedEntryId, onSelectEntry, onToggleFavorite, onDuplicateEntry, onDeleteEntry, onOpenInEditor, searchQuery, language = "en", filterTag: filterTagProp, onFilterTagChange, filterImages: filterImagesProp, onFilterImagesChange }: JournalListViewProps) {
  const { openContextMenu } = useContextMenu();
  // Filters are controlled when the workspace passes them in (so the reading
  // view can open a tag), with a local fallback for standalone use.
  const [filterTagLocal, setFilterTagLocal] = useState("");
  const [filterImagesLocal, setFilterImagesLocal] = useState(false);
  const filterTag = filterTagProp ?? filterTagLocal;
  const filterImages = filterImagesProp ?? filterImagesLocal;
  const setFilterTag = (tag: string) => (onFilterTagChange ?? setFilterTagLocal)(tag);
  const setFilterImages = (value: boolean) => (onFilterImagesChange ?? setFilterImagesLocal)(value);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  function entryHasImages(e: EntryRecord): boolean {
    if (e.metadata.cover) return true;
    return /!\[.*?\]\(.*?\)/.test(e.body);
  }

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const tag of e.metadata.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    // Most-used first, ties broken alphabetically, so the noisiest cadernos
    // surface the relevant tags rather than an arbitrary alphabetical wall.
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [entries]);

  const today = new Date();
  const scopeFiltered = useMemo(() => {
    if (activeSection === "favorites") return entries.filter((e) => e.metadata.favorite);
    if (activeSection === "today") return entries.filter((e) => {
      const d = new Date(e.metadata.date);
      // "On this day": same calendar day/month across all years (incl. current).
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    });
    return entries;
  }, [entries, activeSection]);

  const searched = useMemo(() => searchEntries(scopeFiltered, searchQuery ?? ""), [scopeFiltered, searchQuery]);

  const filtered = useMemo(() => {
    let result = searched;
    if (filterTag) result = result.filter((e) => e.metadata.tags.includes(filterTag));
    if (filterImages) result = result.filter((e) => entryHasImages(e));
    return result;
  }, [searched, filterTag, filterImages]);

  const hasActiveFilters = filterTag !== "" || filterImages;

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
        <p className="text-xs text-center">{hasActiveFilters ? "No entries match filters" : `"${searchQuery}"`}</p>
      </div>
    );
  }

  const months = groupByMonth(filtered);

  function shortMonth(date: Date): string {
    return date.toLocaleDateString(language, { month: "short" });
  }

  const handleEntryContextMenu = (event: React.MouseEvent, entry: EntryRecord) => {
    event.preventDefault();
    const items: ContextMenuEntry[] = [
      { type: "item", id: "open", label: t["journal.open"] || "Open", icon: <FileText size={14} />, onSelect: () => onSelectEntry(entry) },
    ];
    if (onToggleFavorite) {
      items.push({
        type: "item", id: "favorite",
        label: entry.metadata.favorite ? (t["journal.removeFavorite"] || "Remove from favorites") : (t["journal.addFavorite"] || "Add to favorites"),
        icon: entry.metadata.favorite ? <HeartOff size={14} /> : <Heart size={14} />,
        onSelect: () => onToggleFavorite(entry),
      });
    }
    if (onDuplicateEntry) {
      items.push({ type: "item", id: "duplicate", label: t["journal.duplicate"] || "Duplicate", icon: <Copy size={14} />, onSelect: () => onDuplicateEntry(entry) });
    }
    if (onOpenInEditor) {
      items.push({ type: "item", id: "editor", label: t["journal.editor"] || "Open in Editor", icon: <ExternalLink size={14} />, onSelect: () => onOpenInEditor(entry.path) });
    }
    if (onDeleteEntry) {
      items.push({ type: "separator", id: "sep" });
      items.push({ type: "item", id: "delete", label: t["journal.delete"] || "Delete", icon: <Trash2 size={14} />, danger: true, onSelect: () => onDeleteEntry(entry) });
    }
    openContextMenu({ anchor: { type: "point", x: event.clientX, y: event.clientY }, items });
  };

  const entryButton = (entry: EntryRecord) => {
    const d = new Date(entry.metadata.date);
    return (
      <button key={entry.metadata.id} type="button" onClick={() => onSelectEntry(entry)}
        onContextMenu={(e) => handleEntryContextMenu(e, entry)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-b"
        style={{
          borderColor: tConfig.uiBorderHex,
          backgroundColor: selectedEntryId === entry.metadata.id ? tConfig.accentHex + "0C" : "transparent",
          borderLeft: selectedEntryId === entry.metadata.id ? `2px solid ${tConfig.accentHex}` : "2px solid transparent",
        }}>
        <div className="flex flex-col items-center shrink-0 w-8 pt-0.5">
          <span className="text-lg font-bold leading-none" style={{ color: tConfig.fgHex }}>{d.getDate()}</span>
          <span className="text-[10px] font-medium uppercase leading-tight" style={{ color: tConfig.fgHex + "50" }}>{shortMonth(d)}</span>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 w-full min-w-0">
            {entry.metadata.mood && MOOD_EMOJI[entry.metadata.mood] && (
              <span className="text-sm shrink-0">{MOOD_EMOJI[entry.metadata.mood]}</span>
            )}
            <span className="text-sm font-medium truncate"
              style={{ color: selectedEntryId === entry.metadata.id ? tConfig.accentHex : tConfig.fgHex }}>
              {entry.metadata.title || (t["journal.blankEntry"] || "Untitled")}
            </span>
            {entry.metadata.favorite && (
              <Heart size={11} className="shrink-0" style={{ color: tConfig.accentHex }} />
            )}
          </div>
          <p className="text-xs truncate w-full" style={{ color: tConfig.fgHex + "55" }}>
            {entry.metadata.summary || (entry.body.trim() ? getExcerpt(entry.body, 80) : "")}
          </p>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: tConfig.fgHex + "40" }}>
            {entryHasImages(entry) && <ImageIcon size={10} />}
            {entry.metadata.location && (
              <span className="flex items-center gap-0.5"><MapPin size={10} />{entry.metadata.location.label}</span>
            )}
            {entry.wordCount > 0 && <span>{entry.wordCount}w</span>}
          </div>
        </div>
        {entry.metadata.cover && <CoverThumb entryPath={entry.path} cover={entry.metadata.cover} tConfig={tConfig} />}
      </button>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap sticky top-0 z-10 border-b"
        style={{ backgroundColor: tConfig.uiHex, borderColor: tConfig.uiBorderHex }}>
        {!tagsCollapsed && allTags.map(({ tag, count }) => (
          <button key={tag} type="button" onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
            aria-pressed={filterTag === tag}
            className="px-1.5 py-0.5 rounded text-[11px] transition-colors inline-flex items-center gap-1"
            style={{
              backgroundColor: filterTag === tag ? tConfig.accentHex + "30" : tConfig.accentHex + "10",
              color: filterTag === tag ? tConfig.accentHex : tConfig.fgHex + "70",
            }}>
            {tag}
            <span className="tabular-nums opacity-60">{count}</span>
          </button>
        ))}
        {allTags.length > 0 && (
          <button type="button" onClick={() => setTagsCollapsed(!tagsCollapsed)}
            className="px-1 py-0.5 rounded text-[10px] transition-colors"
            style={{ color: tConfig.fgHex + "40" }}>
            {tagsCollapsed ? `+${allTags.length} ${t["journal.tags"] || "tags"}` : `−`}
          </button>
        )}
        <button type="button" onClick={() => setFilterImages(!filterImages)}
          className="px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors"
          style={{
            backgroundColor: filterImages ? tConfig.accentHex + "30" : "transparent",
            color: filterImages ? tConfig.accentHex : tConfig.fgHex + "60",
          }}>
          <ImageIcon size={11} />
          {t["journal.images"] || "Images"}
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={() => { setFilterTag(""); setFilterImages(false); }}
            className="text-[10px] ml-1 underline" style={{ color: tConfig.fgHex + "50" }}>
            {t["journal.clear"] || "Clear"}
          </button>
        )}
        <div className="ml-auto" />
      </div>

      {Array.from(months.entries()).map(([key, monthEntries]) => {
        const collapsed = collapsedMonths.has(key);
        return (
          <div key={key}>
            <button type="button" onClick={() => toggleMonth(key)}
              className="w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-10 border-b flex items-center gap-1.5 text-left"
              style={{
                backgroundColor: tConfig.uiHex,
                color: tConfig.fgHex + "80",
                borderColor: tConfig.uiBorderHex,
              }}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {monthLabel(key, language)}
              <span className="text-[10px] font-normal opacity-50 ml-auto">{monthEntries.length}</span>
            </button>
            {!collapsed && monthEntries.map((entry) => entryButton(entry))}
          </div>
        );
      })}
    </div>
  );
}
