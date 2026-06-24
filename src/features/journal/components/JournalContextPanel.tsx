import { useState } from "react";
import { Search, X, Download, AlertTriangle } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { JournalHeader } from "./JournalHeader";
import { JournalListView } from "./JournalListView";
import { JournalCalendarView } from "./JournalCalendarView";
import { JournalMapView } from "./JournalMapView";
import { ExportRangeDialog } from "./ExportRangeDialog";
import { ExportJournalDialog } from "./ExportJournalDialog";
import type { JournalSessionState } from "../session/journalSession.types";

interface JournalContextPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeView: "list" | "calendar" | "map" | "gallery";
  onViewChange: (view: "list" | "calendar" | "map" | "gallery") => void;
  activeSection: string;
  onNewEntry?: () => void;
  onManageTemplates?: () => void;
  onCreateEntryForDate?: (date: Date) => void;
  journal: JournalDescriptor | null;
  selectedEntryId: string | null;
  onSelectEntry: (entry: EntryRecord) => void;
  onToggleFavorite?: (entry: EntryRecord) => void;
  onDuplicateEntry?: (entry: EntryRecord) => void;
  onDeleteEntry?: (entry: EntryRecord) => void;
  onOpenInEditor?: (path: string) => void;
  sessionState: JournalSessionState;
  language?: string;
  worldMapActive?: boolean;
  onToggleWorldMap?: () => void;
}

export function JournalContextPanel({
  t, tConfig, activeView, onViewChange, activeSection, onManageTemplates, onCreateEntryForDate,
  journal, selectedEntryId, onSelectEntry, onToggleFavorite, onDuplicateEntry, onDeleteEntry, onOpenInEditor,
  sessionState, language, worldMapActive, onToggleWorldMap,
}: JournalContextPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportRange, setShowExportRange] = useState(false);
  const [showExportJournal, setShowExportJournal] = useState(false);
  const allEntries = sessionState.entries;
  const showSearch = activeView === "list" || activeView === "gallery";
  const fileErrorCount = sessionState.fileErrors.length;

  return (
    <div className="flex flex-col h-full min-w-0" style={{ borderRight: `1px solid ${tConfig.uiBorderHex}` }}>
      <JournalHeader
        t={t} tConfig={tConfig} activeView={activeView} onViewChange={onViewChange}
        onExportJournal={() => setShowExportJournal(true)} onManageTemplates={onManageTemplates} journal={journal}
      />
      {journal && fileErrorCount > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 border-b text-[11px]"
          style={{ backgroundColor: "#f59e0b18", color: "#b45309", borderColor: tConfig.uiBorderHex }}
          title={sessionState.fileErrors.slice(0, 8).map((e) => e.path).join("\n")}>
          <AlertTriangle size={13} className="shrink-0 mt-px" />
          <span>
            {(t["journal.filesUnreadable"] || "{n} file(s) couldn't be read — they may be malformed.").replace("{n}", String(fileErrorCount))}
          </span>
        </div>
      )}
      {showSearch && (
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
                className="ml-1 p-1 rounded hover:opacity-60" title={t["journal.exportRange"] || "Export date range"}>
                <Download size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeView === "calendar" ? (
          <JournalCalendarView
            t={t} tConfig={tConfig} journal={journal} entries={allEntries}
            onSelectEntry={onSelectEntry} onCreateEntryForDate={onCreateEntryForDate} language={language}
          />
        ) : activeView === "map" ? (
          <JournalMapView
            t={t} tConfig={tConfig} entries={allEntries} onSelectEntry={onSelectEntry}
            worldMapActive={worldMapActive} onToggleWorldMap={onToggleWorldMap}
          />
        ) : (
          <JournalListView
            t={t} tConfig={tConfig} journal={journal}
            entries={allEntries} activeSection={activeSection}
            selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry}
            onToggleFavorite={onToggleFavorite} onDuplicateEntry={onDuplicateEntry}
            onDeleteEntry={onDeleteEntry} onOpenInEditor={onOpenInEditor}
            searchQuery={searchQuery} language={language}
          />
        )}
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
