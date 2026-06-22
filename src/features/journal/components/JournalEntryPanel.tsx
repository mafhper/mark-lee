import { BookOpen, ExternalLink } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalEntryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entry: EntryRecord | null;
}

export function JournalEntryPanel({ t, tConfig, journal, entry }: JournalEntryPanelProps) {
  const journalName = journal?.name ?? (t["journal.noJournalTitle"] || "No journal open");
  const showEntry = entry !== null && journal !== null;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col" style={{ backgroundColor: tConfig.editorBgHex, color: tConfig.editorFgHex }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] opacity-50 font-medium uppercase tracking-wider" style={{ color: tConfig.fgHex }}>
              {journalName}
              {showEntry && <> &middot; {new Date(entry.metadata.date).toLocaleDateString()}</>}
            </p>
            <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: tConfig.fgHex }}>
              {showEntry ? (entry.metadata.title || "Untitled") : (t["journal.noJournalTitle"] || "No entry selected")}
            </h1>
            {showEntry && entry.metadata.summary && (
              <p className="text-sm" style={{ color: tConfig.fgHex + "80" }}>
                {entry.metadata.summary}
              </p>
            )}
          </div>
          {showEntry && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" className="h-7 w-7 rounded flex items-center justify-center transition-colors"
                style={{ color: tConfig.fgHex + "60" }} title={t["journal.editor"] || "Open in Editor"}>
                <ExternalLink size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: tConfig.fgHex + "70" }}>
          {showEntry ? (
            <>
              {entry.metadata.tags.length > 0 && entry.metadata.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[11px]" style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                  {tag}
                </span>
              ))}
              <span className="opacity-50">{entry.wordCount} words</span>
            </>
          ) : (
            <span className="flex items-center gap-1"><BookOpen size={12} />{t["journal.noJournalDesc"] || "Select an entry"}</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {showEntry ? (
          <div className="prose max-w-none" style={{ color: tConfig.fgHex }}>
            {entry.body.trim() ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</div>
            ) : (
              <p className="text-sm opacity-30 italic">Empty entry. Start writing...</p>
            )}
          </div>
        ) : (
          <JournalEmptyState
            icon={<BookOpen size={36} />}
            title={t["journal.noJournalTitle"] || "No entry selected"}
            description={journal ? (t["journal.emptyStateEntries"] || "Select or create an entry to start writing.") : (t["journal.noJournalDesc"] || "Create or add a journal to start journaling.")}
            tConfig={tConfig}
          />
        )}
      </div>

      <div className="px-6 py-2 border-t text-xs flex items-center gap-4 flex-wrap" style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "70" }}>
        <span>{showEntry ? journalName : "--"}</span>
        {showEntry && <span className="opacity-40">{entry.metadata.date}</span>}
        <span className="opacity-40">{showEntry ? `${entry.wordCount} words` : "--"}</span>
      </div>
    </div>
  );
}
