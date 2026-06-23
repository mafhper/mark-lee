import { BookOpen, Download, FileText } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";

interface JournalHeaderProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onExportJournal?: () => void;
  onManageTemplates?: () => void;
  journal: JournalDescriptor | null;
}

export function JournalHeader({ t, tConfig, onExportJournal, onManageTemplates, journal }: JournalHeaderProps) {
  const name = journal?.name ?? (t["journal.noJournalTitle"] || "No blog open");
  const desc = journal?.description ?? (journal ? "" : (t["journal.noJournalDesc"] || "Create or add a blog to start posting."));

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
              style={{ color: tConfig.fgHex + "60" }} title="Export blog">
              <Download size={14} />
            </button>
          )}
          {onManageTemplates && journal && (
            <button type="button" onClick={onManageTemplates}
              className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }} title="Manage templates">
              <FileText size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
