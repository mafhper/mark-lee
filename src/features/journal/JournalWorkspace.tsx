import { useState } from "react";
import type { ThemeConfig } from "../../types";
import { useJournalLibrary } from "./hooks/useJournalLibrary";
import { JournalNavigation } from "./components/JournalNavigation";
import { JournalContextPanel } from "./components/JournalContextPanel";
import { JournalEntryPanel } from "./components/JournalEntryPanel";
import { CreateJournalDialog } from "./components/CreateJournalDialog";

interface JournalWorkspaceProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  isZenMode: boolean;
  language: string;
}

export function JournalWorkspace({ t, tConfig, isZenMode, language }: JournalWorkspaceProps) {
  const [activeView, setActiveView] = useState<"list" | "calendar" | "map">("list");
  const [activeSection, setActiveSection] = useState("entries");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { journals, activeJournal, selectJournal, addJournal, loading } = useJournalLibrary();

  return (
    <div
      className="flex-1 min-h-0 flex flex-row"
    >
      {/* Painel 1 — Navegação principal */}
      <div
        className="h-full shrink-0 border-r"
        style={{
          width: "220px",
          borderColor: tConfig.uiBorderHex,
          display: isZenMode ? "none" : undefined,
        }}
      >
        <JournalNavigation
          t={t}
          tConfig={tConfig}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          journals={journals}
          activeJournalId={activeJournal?.id ?? null}
          onSelectJournal={selectJournal}
          onCreateJournal={() => setShowCreateDialog(true)}
          loading={loading}
        />
      </div>

      {/* Painel 2 — Visão contextual */}
      <div
        className="h-full"
        style={{
          width: "320px",
          minWidth: "280px",
          display: isZenMode ? "none" : undefined,
        }}
      >
        <JournalContextPanel
          t={t}
          tConfig={tConfig}
          activeView={activeView}
          onViewChange={setActiveView}
          journal={activeJournal}
        />
      </div>

      {/* Painel 3 — Entrada */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <JournalEntryPanel t={t} tConfig={tConfig} journal={activeJournal} />
      </div>

      <CreateJournalDialog
        open={showCreateDialog}
        t={t}
        tConfig={tConfig}
        defaultLanguage={language}
        onClose={() => setShowCreateDialog(false)}
        onCreated={addJournal}
      />
    </div>
  );
}
