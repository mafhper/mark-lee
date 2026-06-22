import { BookOpen, ExternalLink } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalEntryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
}

export function JournalEntryPanel({ t, tConfig, journal }: JournalEntryPanelProps) {
  const journalName = journal?.name ?? (t["journal.noJournalTitle"] || "No journal open");
  const showJournal = journal !== null;

  return (
    <div
      className="flex-1 min-w-0 h-full flex flex-col"
      style={{ backgroundColor: tConfig.editorBgHex, color: tConfig.editorFgHex }}
    >
      <div className="px-6 py-4 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] opacity-50 font-medium uppercase tracking-wider" style={{ color: tConfig.fgHex }}>
              {showJournal ? journalName : (t["journal.noJournalTitle"] || "No journal")} &middot; --
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: tConfig.fgHex }}>
              {showJournal ? (t["journal.noJournalTitle"] || "No entry selected") : (t["journal.noJournalTitle"] || "No journal open")}
            </h1>
          </div>
          {showJournal && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="h-7 w-7 rounded flex items-center justify-center transition-colors"
                style={{ color: tConfig.fgHex + "60" }}
                title={t["journal.editor"] || "Open in Editor"}
              >
                <ExternalLink size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: tConfig.fgHex + "70" }}>
          {showJournal ? (
            <>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tConfig.uiBorderHex }} />
                {t["journal.entries"] || "0 entries"}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {journalName}
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {t["journal.noJournalDesc"] || "Select or create a journal"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <JournalEmptyState
          icon={<BookOpen size={36} />}
          title={t["journal.noJournalTitle"] || "No entry selected"}
          description={showJournal
            ? (t["journal.emptyStateEntries"] || "Select or create an entry to start writing.")
            : (t["journal.noJournalDesc"] || "Create or add a journal to start journaling.")
          }
          tConfig={tConfig}
        />
      </div>

      <div
        className="px-6 py-2 border-t text-xs flex items-center gap-4 flex-wrap"
        style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "70" }}
      >
        <span>{showJournal ? (t["journal.editor"] || "Journal") : "--"}</span>
        <span className="opacity-40">{showJournal ? journalName : "--"}</span>
      </div>
    </div>
  );
}
