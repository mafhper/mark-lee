import { useState, useCallback } from "react";
import type { ThemeConfig } from "../../types";
import { useJournalLibrary } from "./hooks/useJournalLibrary";
import { JournalNavigation } from "./components/JournalNavigation";
import { JournalContextPanel } from "./components/JournalContextPanel";
import { JournalEntryPanel } from "./components/JournalEntryPanel";
import { TemplatePickerDialog } from "./components/TemplatePickerDialog";
import { TemplateManagerDialog } from "./components/TemplateManagerDialog";
import { CreateJournalDialog } from "./components/CreateJournalDialog";
import { AddExistingJournalDialog } from "./components/AddExistingJournalDialog";
import { RemoveJournalDialog } from "./components/RemoveJournalDialog";
import { checkManifest } from "./domain/manifest-service";
import { addJournal } from "./domain/library-service";
import { createEntry, deleteEntry, duplicateEntry, readEntry } from "./domain/entry-service";
import { openFileDialog } from "../../services/filesystem";
import type { JournalDescriptor } from "./domain/journal.types";
import type { EntryRecord } from "./domain/entry-service";

interface JournalWorkspaceProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  isZenMode: boolean;
  language: string;
  onOpenFile?: (path: string) => void;
  journalDataDir?: string;
}

export function JournalWorkspace({ t, tConfig, isZenMode, language, onOpenFile, journalDataDir }: JournalWorkspaceProps) {
  const [activeView, setActiveView] = useState<"list" | "calendar" | "map" | "gallery">("list");
  const [activeSection, setActiveSection] = useState("entries");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<JournalDescriptor | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);
  const [listKey, setListKey] = useState(0);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const { journals, activeJournal, selectJournal, addJournal: addToLib, removeJournal: removeFromLib, reload } = useJournalLibrary();

  const handleRelocate = async (journalId: string) => {
    const selected = await openFileDialog({ directory: true, multiple: false });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    const result = await checkManifest(path);
    if (!result.manifest || result.manifest.id !== journalId) return;
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

  const handleReloadEntry = async () => {
    if (!selectedEntry) return;
    const reloaded = await readEntry(selectedEntry.path);
    if (reloaded) setSelectedEntry(reloaded);
  };

  const handleDuplicateEntry = async (entry: EntryRecord) => {
    if (!activeJournal) return;
    const dup = await duplicateEntry(activeJournal.rootPath, entry);
    setSelectedEntry(dup);
    setListKey((k) => k + 1);
  };

  const handleDeleteEntry = async (entry: EntryRecord) => {
    await deleteEntry(entry.path);
    setSelectedEntry(null);
    setListKey((k) => k + 1);
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    await removeFromLib(removeTarget.id);
    setRemoveTarget(null);
  };

  const handleNewEntry = useCallback(() => {
    if (!activeJournal) return;
    setShowTemplatePicker(true);
  }, [activeJournal]);

  const handleCreateFromTemplate = useCallback(async (templateBody: string) => {
    if (!activeJournal) return;
    const entry = await createEntry(activeJournal.rootPath, "", new Date(), [], templateBody);
    setSelectedEntry(entry);
    setActiveView("list");
    setListKey((k) => k + 1);
  }, [activeJournal]);

  const handleSelectEntry = useCallback((entry: EntryRecord) => {
    setSelectedEntry(entry);
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-row">
      <div
        className="h-full shrink-0 border-r"
        style={{ width: "220px", borderColor: tConfig.uiBorderHex, display: isZenMode ? "none" : undefined }}
      >
        <JournalNavigation
          t={t} tConfig={tConfig} activeSection={activeSection} onSectionChange={setActiveSection}
          journals={journals} activeJournalId={activeJournal?.id ?? null}
          onSelectJournal={(id) => { selectJournal(id); setSelectedEntry(null); }}
          onCreateJournal={() => setShowCreateDialog(true)}
          onAddJournal={() => setShowAddDialog(true)}
          onRelocateJournal={handleRelocate}
          onRemoveJournal={(id) => setRemoveTarget(journals.find((j) => j.id === id) ?? null)}
          onManageTemplates={() => setShowTemplateManager(true)}
          loading={false}
        />
      </div>

      <div
        className="h-full"
        style={{ width: "320px", minWidth: "280px", display: isZenMode ? "none" : undefined }}
      >
        <JournalContextPanel
          t={t} tConfig={tConfig} activeView={activeView} onViewChange={setActiveView}
          journal={activeJournal}
          selectedEntryId={selectedEntry?.metadata.id ?? null}
          onSelectEntry={handleSelectEntry}
          onNewEntry={handleNewEntry}
          listKey={listKey}
        />
      </div>

      <div className="flex-1 min-w-0 h-full flex flex-col">
        <JournalEntryPanel
          t={t} tConfig={tConfig} journal={activeJournal} entry={selectedEntry}
          onEntryUpdated={setSelectedEntry}
          onOpenInEditor={onOpenFile}
          onDeleteEntry={handleDeleteEntry}
          onDuplicateEntry={handleDuplicateEntry}
          onReloadEntry={handleReloadEntry}
        />
      </div>

      <CreateJournalDialog open={showCreateDialog} t={t} tConfig={tConfig} defaultLanguage={language}
        journalDataDir={journalDataDir} onClose={() => setShowCreateDialog(false)} onCreated={addToLib} />
      <AddExistingJournalDialog open={showAddDialog} t={t} tConfig={tConfig}
        onClose={() => setShowAddDialog(false)} onAdded={addToLib} />
      <RemoveJournalDialog open={removeTarget !== null}
        journalName={removeTarget?.name ?? ""} journalPath={removeTarget?.rootPath ?? ""}
        tConfig={tConfig} onClose={() => setRemoveTarget(null)} onConfirm={handleRemoveConfirm} />
      <TemplatePickerDialog open={showTemplatePicker}
        tConfig={tConfig} journalRootPath={activeJournal?.rootPath ?? ""}
        onClose={() => setShowTemplatePicker(false)} onSelect={handleCreateFromTemplate} />
      <TemplateManagerDialog open={showTemplateManager}
        tConfig={tConfig} journalRootPath={activeJournal?.rootPath ?? ""}
        onClose={() => setShowTemplateManager(false)} />
    </div>
  );
}
