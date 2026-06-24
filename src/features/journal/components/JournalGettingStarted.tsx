import { BookOpen, PenLine } from "lucide-react";
import type { ThemeConfig } from "../../../types";

interface JournalGettingStartedProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  hasEntries: boolean;
  onNewEntry: () => void;
}

export function JournalGettingStarted({ t, tConfig, hasEntries, onNewEntry }: JournalGettingStartedProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="space-y-3">
          <div className="h-14 w-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: tConfig.accentHex + "15", color: tConfig.accentHex }}>
            <BookOpen size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: tConfig.fgHex }}>
            {hasEntries
              ? (t["journal.list"] || "Select an entry")
              : (t["journal.createFirstEntry"] || "Welcome")}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tConfig.fgHex + "65" }}>
            {hasEntries
              ? (t["journal.search"] || "Choose an entry from the list.")
              : (t["journal.emptyStateCalendar"] || "Start writing your first entry.")}
          </p>
        </div>

        {!hasEntries && (
          <button type="button" onClick={onNewEntry}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            <PenLine size={16} />
            {t["journal.createFirstEntry"] || "Create your first entry"}
          </button>
        )}
      </div>
    </div>
  );
}
