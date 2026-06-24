import { BookOpen, Download, FileText, List, Calendar, Image as ImageIcon, Map as MapIcon } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";

type JournalView = "list" | "calendar" | "map" | "gallery";

interface JournalHeaderProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeView: JournalView;
  onViewChange: (view: JournalView) => void;
  onExportJournal?: () => void;
  onManageTemplates?: () => void;
  journal: JournalDescriptor | null;
}

export function JournalHeader({ t, tConfig, activeView, onViewChange, onExportJournal, onManageTemplates, journal }: JournalHeaderProps) {
  const name = journal?.name ?? (t["journal.noJournalTitle"] || "No notebook open");
  const desc = journal?.description ?? (journal ? "" : (t["journal.noJournalDesc"] || "Create or add a notebook to start recording."));

  const views: { id: JournalView; label: string; icon: typeof List }[] = [
    { id: "list", label: t["journal.list"] || "List", icon: List },
    { id: "calendar", label: t["journal.calendar"] || "Calendar", icon: Calendar },
    { id: "gallery", label: t["journal.gallery"] || "Gallery", icon: ImageIcon },
    { id: "map", label: t["journal.places"] || "Places", icon: MapIcon },
  ];

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
        <div className="flex items-center gap-1 shrink-0">
          {onExportJournal && journal && (
            <button type="button" onClick={onExportJournal}
              className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }} title={t["journal.exportJournal"] || "Export notebook"}>
              <Download size={14} />
            </button>
          )}
          {onManageTemplates && journal && (
            <button type="button" onClick={onManageTemplates}
              className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }} title={t["journal.manageTemplates"] || "Manage templates"}>
              <FileText size={14} />
            </button>
          )}
        </div>
      </div>

      {journal && (
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: tConfig.uiHex }}>
          {views.map((view) => {
            const active = activeView === view.id;
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => onViewChange(view.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? tConfig.bgHex : "transparent",
                  color: active ? tConfig.accentHex : tConfig.fgHex + "70",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
                title={view.label}
                aria-pressed={active}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
