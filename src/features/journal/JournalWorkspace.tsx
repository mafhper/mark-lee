import { useState } from "react";
import type { ThemeConfig } from "../../types";
import { useJournalLibrary } from "./hooks/useJournalLibrary";
import { JournalNavigation } from "./components/JournalNavigation";
import { JournalContextPanel } from "./components/JournalContextPanel";
import { JournalEntryPanel } from "./components/JournalEntryPanel";
import { CreateJournalDialog } from "./components/CreateJournalDialog";
import { AddExistingJournalDialog } from "./components/AddExistingJournalDialog";
import { RemoveJournalDialog } from "./components/RemoveJournalDialog";
import { checkManifest } from "./domain/manifest-service";
import { addJournal } from "./domain/library-service";
import { openFileDialog } from "../../services/filesystem";
import type { JournalDescriptor } from "./domain/journal.types";

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<JournalDescriptor | null>(null);
  const { journals, activeJournal, selectJournal, addJournal: addToLib, removeJournal: removeFromLib, reload } = useJournalLibrary();

  const handleRelocate = async (journalId: string) => {
    const selected = await openFileDialog({ directory: true, multiple: false });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;

    const result = await checkManifest(path);
    if (!result.manifest || result.manifest.id !== journalId) {
      return;
    }

    const descriptor: JournalDescriptor = {
      id: result.manifest.id,
      name: result.manifest.name,
      rootPath: path,
      description: result.manifest.description,
      schemaVersion: result.manifest.schemaVersion,
      createdAt: result.manifest.createdAt,
    };

    await addJournal(descriptor);
    reload();
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    await removeFromLib(removeTarget.id);
    setRemoveTarget(null);
  };

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
          onAddJournal={() => setShowAddDialog(true)}
          onRelocateJournal={handleRelocate}
          onRemoveJournal={(id) => setRemoveTarget(journals.find((j) => j.id === id) ?? null)}
          loading={false}
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
        onCreated={addToLib}
      />

      <AddExistingJournalDialog
        open={showAddDialog}
        t={t}
        tConfig={tConfig}
        onClose={() => setShowAddDialog(false)}
        onAdded={addToLib}
      />

      <RemoveJournalDialog
        open={removeTarget !== null}
        journalName={removeTarget?.name ?? ""}
        journalPath={removeTarget?.rootPath ?? ""}
        tConfig={tConfig}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
