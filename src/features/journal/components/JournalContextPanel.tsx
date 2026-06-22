import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { JournalHeader } from "./JournalHeader";
import { JournalListView } from "./JournalListView";
import { JournalCalendarView } from "./JournalCalendarView";
import { JournalMapView } from "./JournalMapView";

interface JournalContextPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeView: "list" | "calendar" | "map";
  onViewChange: (view: "list" | "calendar" | "map") => void;
  onNewEntry?: () => void;
  journal: JournalDescriptor | null;
}

export function JournalContextPanel({ t, tConfig, activeView, onViewChange, onNewEntry, journal }: JournalContextPanelProps) {
  return (
    <div className="flex flex-col h-full min-w-0" style={{ borderRight: `1px solid ${tConfig.uiBorderHex}` }}>
      <JournalHeader
        t={t}
        tConfig={tConfig}
        activeView={activeView}
        onViewChange={onViewChange}
        onNewEntry={onNewEntry}
        journal={journal}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeView === "list" && <JournalListView t={t} tConfig={tConfig} />}
        {activeView === "calendar" && <JournalCalendarView t={t} tConfig={tConfig} />}
        {activeView === "map" && <JournalMapView t={t} tConfig={tConfig} />}
      </div>
    </div>
  );
}
