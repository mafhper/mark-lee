import { BookOpen, Plus, Calendar, MapPin, LayoutGrid } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";

interface JournalHeaderProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeView: "list" | "calendar" | "map" | "gallery";
  onViewChange: (view: "list" | "calendar" | "map" | "gallery") => void;
  onNewEntry?: () => void;
  journal: JournalDescriptor | null;
}

export function JournalHeader({ t, tConfig, activeView, onViewChange, onNewEntry, journal }: JournalHeaderProps) {
  const views: Array<{ id: "list" | "calendar" | "map" | "gallery"; label: string; icon: React.ReactNode }> = [
    { id: "list", label: t["journal.list"] || "List", icon: <BookOpen size={14} /> },
    { id: "calendar", label: t["journal.calendar"] || "Calendar", icon: <Calendar size={14} /> },
    { id: "gallery", label: "Gallery", icon: <LayoutGrid size={14} /> },
    { id: "map", label: t["journal.map"] || "Map", icon: <MapPin size={14} /> },
  ];

  const name = journal?.name ?? (t["journal.noJournalTitle"] || "No journal open");
  const desc = journal?.description ?? (journal ? "" : (t["journal.noJournalDesc"] || "Create or add a journal to start journaling."));

  return (
    <div
      className="px-4 py-3 border-b space-y-3"
      style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex }}
    >
      <div className="flex items-center gap-2 justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-8 w-8 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}
          >
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate" style={{ color: tConfig.fgHex }}>
              {name}
            </h2>
            {desc && (
              <p className="text-xs truncate" style={{ color: tConfig.fgHex + "80" }}>
                {desc}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onViewChange(v.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors`}
            style={
              activeView === v.id
                ? { color: tConfig.accentHex, backgroundColor: tConfig.accentHex + "18" }
                : { color: tConfig.fgHex + "80", backgroundColor: "transparent" }
            }
          >
            {v.icon}
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {onNewEntry && journal && (
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors"
            style={{ color: tConfig.accentHex, backgroundColor: tConfig.accentHex + "18" }}
            onClick={onNewEntry}
          >
            <Plus size={13} />
            <span className="hidden sm:inline">{t["journal.newEntry"] || "New entry"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
