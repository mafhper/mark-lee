import { useState, useEffect } from "react";
import { Search, X, Download } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { listEntries } from "../domain/entry-service";
import { JournalHeader } from "./JournalHeader";
import { JournalListView } from "./JournalListView";
import { JournalCalendarView } from "./JournalCalendarView";
import { JournalMapView } from "./JournalMapView";
import { JournalGalleryView } from "./JournalGalleryView";
import { ExportRangeDialog } from "./ExportRangeDialog";
import { ExportJournalDialog } from "./ExportJournalDialog";

interface JournalContextPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeView: "list" | "calendar" | "map" | "gallery";
  onViewChange: (view: "list" | "calendar" | "map" | "gallery") => void;
  onNewEntry?: () => void;
  onManageTemplates?: () => void;
  journal: JournalDescriptor | null;
  selectedEntryId: string | null;
  onSelectEntry: (entry: EntryRecord) => void;
  listKey: number;
  onEntryStatsChange?: (stats: { total: number; favorites: number; images: number; locations: number }) => void;
}

export function JournalContextPanel({
  t, tConfig, activeView, onManageTemplates, journal, selectedEntryId, onSelectEntry, listKey, onEntryStatsChange,
}: JournalContextPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportRange, setShowExportRange] = useState(false);
  const [showExportJournal, setShowExportJournal] = useState(false);
  const [allEntries, setAllEntries] = useState<EntryRecord[]>([]);

  useEffect(() => {
    if (!journal) { setAllEntries([]); return; }
    listEntries(journal.rootPath).then((r) => {
      setAllEntries(r.entries);
      const stats = {
        total: r.entries.length,
        favorites: r.entries.filter((e) => e.metadata.favorite).length,
        images: r.entries.filter((e) => e.metadata.cover || /!\[.*?\]\(.*?\)/.test(e.body)).length,
        locations: r.entries.filter((e) => e.metadata.location).length,
      };
      onEntryStatsChange?.(stats);
    }).catch(() => setAllEntries([]));
  }, [journal?.rootPath]);

  return (
    <div className="flex flex-col h-full min-w-0" style={{ borderRight: `1px solid ${tConfig.uiBorderHex}` }}>
      <JournalHeader
        t={t} tConfig={tConfig} onExportJournal={() => setShowExportJournal(true)} onManageTemplates={onManageTemplates} journal={journal}
      />
      <div className="px-3 py-2 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
        <div className="flex items-center gap-1 px-2 py-1 rounded text-xs"
          style={{ backgroundColor: tConfig.uiHex, color: tConfig.fgHex + "60" }}>
          <Search size={12} className="shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: tConfig.fgHex }} placeholder={t["journal.search"] || "Search entries..."} />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="hover:opacity-60">
              <X size={12} />
            </button>
          )}
          {journal && (
            <button type="button" onClick={() => setShowExportRange(true)}
              className="ml-1 p-1 rounded hover:opacity-60" title="Export date range">
              <Download size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeView === "list" && (
          <JournalListView
            key={listKey}
            t={t} tConfig={tConfig} journal={journal}
            selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry}
            searchQuery={searchQuery}
          />
        )}
        {activeView === "calendar" && <JournalCalendarView t={t} tConfig={tConfig} journal={journal} onSelectEntry={onSelectEntry} />}
        {activeView === "gallery" && <JournalGalleryView t={t} tConfig={tConfig} journal={journal} onSelectEntry={onSelectEntry} />}
        {activeView === "map" && <JournalMapView t={t} tConfig={tConfig} entries={allEntries} onSelectEntry={onSelectEntry} />}
      </div>
      <ExportRangeDialog open={showExportRange} tConfig={tConfig}
        journalRootPath={journal?.rootPath ?? ""}
        onClose={() => setShowExportRange(false)} />
      <ExportJournalDialog open={showExportJournal} tConfig={tConfig}
        journalRootPath={journal?.rootPath ?? ""}
        onClose={() => setShowExportJournal(false)} />
    </div>
  );
}
