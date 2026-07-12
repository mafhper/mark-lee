import { useState, useMemo, useEffect, useRef } from "react";
import { FileText, Heart, HeartOff, MapPin, Image as ImageIcon, Search, ChevronDown, ChevronRight, Copy, ExternalLink, Trash2, ListTodo } from "lucide-react";
import { useContextMenu, type ContextMenuEntry } from "../../../app/components/context-menu";
import { MOOD_EMOJI } from "../domain/moods";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { getExcerpt, searchEntries } from "../domain/entry-service";
import { firstEntryImageRef, collectEntryImageRefs } from "../domain/entry-images";
import { filterEntriesByTags } from "../domain/tag-service";
import { entryMatchesLocation, type LocationFilter } from "../location/locationFilter";
import { JournalEmptyState } from "./JournalEmptyState";
import { loadImage } from "../../../services/filesystem";
import type { JournalTaskStatus } from "../domain/journal-entry.types";
import { filterEntriesByTaskStatus } from "../domain/task-status";

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
  filterTags?: string[];
  onFilterTagsChange?: (tags: string[]) => void;
  filterImages?: boolean;
  onFilterImagesChange?: (value: boolean) => void;
  filterTaskStatus?: JournalTaskStatus | null;
  onFilterTaskStatusChange?: (status: JournalTaskStatus | null) => void;
  /** Place filter chosen from the Lugares tree; cleared via onClearLocation. */
  filterLocation?: LocationFilter | null;
  onClearLocation?: () => void;
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

function CoverThumb({ entryPath, imageRef, tConfig }: { entryPath: string; imageRef: string; tConfig: ThemeConfig }) {
  const [url, setUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    setUrl(null);
    const dir = entryPath.substring(0, entryPath.lastIndexOf("/"));
    loadImage(dir + "/" + imageRef).then((next) => { if (mountedRef.current) setUrl(next); }).catch(() => { if (mountedRef.current) setUrl(null); });
    return () => { mountedRef.current = false; };
  }, [entryPath, imageRef]);
  if (!url) return null;
  return (
    <div className="w-10 h-10 rounded overflow-hidden shrink-0 mt-0.5"
      style={{ backgroundColor: tConfig.accentHex + "10" }}>
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

export function JournalListView({ t, tConfig, journal, entries, activeSection, selectedEntryId, onSelectEntry, onToggleFavorite, onDuplicateEntry, onDeleteEntry, onOpenInEditor, searchQuery, language = "en", filterTags: filterTagsProp, onFilterTagsChange, filterImages: filterImagesProp, onFilterImagesChange, filterTaskStatus: filterTaskStatusProp, onFilterTaskStatusChange, filterLocation, onClearLocation }: JournalListViewProps) {
  const { openContextMenu } = useContextMenu();
  // Filters are controlled when the workspace passes them in (so the reading
  // view can open a tag), with a local fallback for standalone use.
  const [filterTagsLocal, setFilterTagsLocal] = useState<string[]>([]);
  const [filterImagesLocal, setFilterImagesLocal] = useState(false);
  const [filterTaskStatusLocal, setFilterTaskStatusLocal] = useState<JournalTaskStatus | null>(null);
  const filterTags = filterTagsProp ?? filterTagsLocal;
  const filterImages = filterImagesProp ?? filterImagesLocal;
  const filterTaskStatus = filterTaskStatusProp ?? filterTaskStatusLocal;
  const setFilterTags = (tags: string[]) => (onFilterTagsChange ?? setFilterTagsLocal)(tags);
  const setFilterImages = (value: boolean) => (onFilterImagesChange ?? setFilterImagesLocal)(value);
  const setFilterTaskStatus = (status: JournalTaskStatus | null) => (onFilterTaskStatusChange ?? setFilterTaskStatusLocal)(status);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  function entryHasImages(e: EntryRecord): boolean {
    return collectEntryImageRefs(e).length > 0;
  }

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
    result = filterEntriesByTags(result, filterTags);
    result = filterEntriesByTaskStatus(result, filterTaskStatus);
    if (filterImages) result = result.filter((e) => entryHasImages(e));
    if (filterLocation) result = result.filter((e) => entryMatchesLocation(e.metadata.location, filterLocation));
    return result;
  }, [searched, filterTags, filterTaskStatus, filterImages, filterLocation]);

  const hasActiveFilters = filterTags.length > 0 || !!filterTaskStatus || filterImages || !!filterLocation;

  const taskStatusLabels: Record<JournalTaskStatus, string> = {
    pending: t["journal.task.pending"] || "Pendente",
    in_progress: t["journal.task.inProgress"] || "Em execução",
    completed: t["journal.task.completed"] || "Finalizada",
    cancelled: t["journal.task.cancelled"] || "Cancelada",
  };

  useEffect(() => {
    if (!selectedEntryId || typeof CSS === "undefined" || !CSS.escape) return;
    const node = listRef.current?.querySelector(`[data-journal-entry-id="${CSS.escape(selectedEntryId)}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedEntryId, filtered]);

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
    const thumbRef = firstEntryImageRef(entry);
    return (
      <button key={entry.metadata.id} type="button" onClick={() => onSelectEntry(entry)}
        onContextMenu={(e) => handleEntryContextMenu(e, entry)}
        data-journal-entry-id={entry.metadata.id}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-b"
        style={{
          borderColor: tConfig.uiBorderHex,
          backgroundColor: selectedEntryId === entry.metadata.id ? tConfig.accentHex + "0C" : "transparent",
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
            {entry.metadata.taskStatus && (
              <span className="inline-flex items-center gap-1 rounded border px-1 py-0.5"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "70" }}>
                <ListTodo size={9} /> {taskStatusLabels[entry.metadata.taskStatus]}
              </span>
            )}
            {entry.wordCount > 0 && <span>{entry.wordCount}w</span>}
          </div>
        </div>
        {thumbRef && <CoverThumb entryPath={entry.path} imageRef={thumbRef} tConfig={tConfig} />}
      </button>
    );
  };

  return (
    <div ref={listRef} className="flex flex-col">
      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap sticky top-0 z-10 border-b"
        style={{ backgroundColor: tConfig.uiHex, borderColor: tConfig.uiBorderHex }}>
        {filterTags.map((filterTag) => (
          <button key={filterTag} type="button" onClick={() => setFilterTags(filterTags.filter((tag) => tag !== filterTag))}
            className="px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1 transition-colors"
            style={{ backgroundColor: tConfig.accentHex + "30", color: tConfig.accentHex }}
            title={t["journal.clear"] || "Clear"}>
            <span>#</span>
            {filterTag}
            <span aria-hidden>×</span>
          </button>
        ))}
        {filterLocation && (
          <button type="button" onClick={onClearLocation}
            className="px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1 transition-colors"
            style={{ backgroundColor: tConfig.accentHex + "30", color: tConfig.accentHex }}
            title={t["journal.clear"] || "Clear"}>
            <MapPin size={11} />
            {filterLocation.value}
            <span aria-hidden>×</span>
          </button>
        )}
        {filterTaskStatus && (
          <button type="button" onClick={() => setFilterTaskStatus(null)}
            className="px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1 transition-colors"
            style={{ backgroundColor: tConfig.accentHex + "30", color: tConfig.accentHex }}
            title={t["journal.clear"] || "Clear"}>
            <ListTodo size={11} />
            {taskStatusLabels[filterTaskStatus]}
            <span aria-hidden>×</span>
          </button>
        )}
        {hasActiveFilters && (
          <button type="button" onClick={() => { setFilterTags([]); setFilterImages(false); setFilterTaskStatus(null); onClearLocation?.(); }}
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
