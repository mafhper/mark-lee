import { useState, useCallback, useRef, useEffect } from "react";
import type { ThemeConfig } from "../../types";
import { useJournalLibrary } from "./hooks/useJournalLibrary";
import { JournalNavigation } from "./components/JournalNavigation";
import { JournalContextPanel } from "./components/JournalContextPanel";
import { JournalEntryPanel } from "./components/JournalEntryPanel";
import { JournalGalleryView } from "./components/JournalGalleryView";
import { JournalAtlasMap } from "./components/JournalAtlasMap";
import { ResizablePanel } from "./components/ResizablePanel";
import { TemplatePickerDialog } from "./components/TemplatePickerDialog";
import { TemplateManagerDialog } from "./components/TemplateManagerDialog";
import { CreateJournalDialog } from "./components/CreateJournalDialog";
import { AddExistingJournalDialog } from "./components/AddExistingJournalDialog";
import { RemoveJournalDialog } from "./components/RemoveJournalDialog";
import { CustomizeJournalDialog } from "./components/CustomizeJournalDialog";
import { checkManifest } from "./domain/manifest-service";
import { addJournal } from "./domain/library-service";
import { createEntry, deleteEntry, duplicateEntry, readEntry } from "./domain/entry-service";
import { openFileDialog } from "../../services/filesystem";
import type { JournalDescriptor } from "./domain/journal.types";
import type { EntryRecord } from "./domain/entry-service";
import { JournalSessionProvider, useJournalSession } from "./session/JournalSessionContext";

interface JournalWorkspaceProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  isZenMode: boolean;
  language: string;
  viewMode?: "edit" | "split" | "preview";
  sidebarEnabled?: boolean;
  onOpenFile?: (path: string) => void;
  journalDataDir?: string;
  readOnly?: boolean;
}

function JournalWorkspaceInner({ t, tConfig, isZenMode, language, viewMode, sidebarEnabled, onOpenFile, journals, activeJournal, selectJournal, addToLib, removeFromLib, reload, journalDataDir, readOnly }: JournalWorkspaceProps & {
  journals: JournalDescriptor[];
  activeJournal: JournalDescriptor | null;
  selectJournal: (id: string | null) => void;
  addToLib: (j: JournalDescriptor) => void | Promise<void>;
  removeFromLib: (id: string) => Promise<void>;
  reload: () => void;
}) {
  const { state: sessionState, dispatch } = useJournalSession();
  const [activeView, setActiveView] = useState<"list" | "calendar" | "map" | "gallery">("list");
  const [activeSection, setActiveSection] = useState("entries");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<JournalDescriptor | null>(null);
  const [customizeId, setCustomizeId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const sidebarWidthRef = useRef(240);
  const handleSidebarWidthChange = useCallback((w: number) => { sidebarWidthRef.current = w; }, []);

  const activeEntry = sessionState.activeEntryId
    ? sessionState.entries.find((e) => e.metadata.id === sessionState.activeEntryId) ?? null
    : null;

  // Adjacent entries for blog-style prev/next paging in the reading view.
  // sessionState.entries is sorted newest-first, so the older one sits after the
  // active index and the newer one before it.
  const activeIndex = activeEntry
    ? sessionState.entries.findIndex((e) => e.metadata.id === activeEntry.metadata.id)
    : -1;
  const olderEntry = activeIndex >= 0 && activeIndex < sessionState.entries.length - 1
    ? sessionState.entries[activeIndex + 1] : null;
  const newerEntry = activeIndex > 0 ? sessionState.entries[activeIndex - 1] : null;

  // The world map only belongs to the Lugares view; hide it elsewhere.
  useEffect(() => {
    if (activeView !== "map") setShowWorldMap(false);
  }, [activeView]);

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
    if (!activeEntry) return;
    const reloaded = await readEntry(activeEntry.path);
    if (reloaded) {
      dispatch({ type: "UPDATE_ENTRY", entry: reloaded });
    }
  };

  const handleDuplicateEntry = async (entry: EntryRecord) => {
    if (!activeJournal) return;
    const dup = await duplicateEntry(activeJournal.rootPath, entry);
    dispatch({ type: "ADD_ENTRY", entry: dup });
    dispatch({ type: "SET_ACTIVE_ENTRY", entryId: dup.metadata.id });
  };

  const handleDeleteEntry = async (entry: EntryRecord) => {
    await deleteEntry(entry.path);
    dispatch({ type: "REMOVE_ENTRY", entryId: entry.metadata.id });
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    await removeFromLib(removeTarget.id);
    setRemoveTarget(null);
  };

  const handleEntryUpdated = useCallback((entry: EntryRecord) => {
    dispatch({ type: "UPDATE_ENTRY", entry });
  }, [dispatch]);

  const handleNewEntry = useCallback(() => {
    if (!activeJournal) return;
    setShowTemplatePicker(true);
  }, [activeJournal]);

  const handleCreateFromTemplate = useCallback(async (templateBody: string) => {
    if (!activeJournal) return;
    const entry = await createEntry(activeJournal.rootPath, "", new Date(), [], templateBody);
    dispatch({ type: "ADD_ENTRY", entry });
    dispatch({ type: "SET_ACTIVE_ENTRY", entryId: entry.metadata.id });
    setActiveView("list");
  }, [activeJournal, dispatch]);

  const handleSelectEntry = useCallback((entry: EntryRecord) => {
    dispatch({ type: "SET_ACTIVE_ENTRY", entryId: entry.metadata.id });
    setShowWorldMap(false); // selecting an entry shows it in the canvas
  }, [dispatch]);

  // Selecting an entry from a full-canvas view (calendar/gallery/map) returns to
  // the entry surface so the reader/editor takes over the canvas.
  const handleSelectEntryFromView = useCallback((entry: EntryRecord) => {
    dispatch({ type: "SET_ACTIVE_ENTRY", entryId: entry.metadata.id });
    setActiveView("list");
  }, [dispatch]);

  const handleCreateEntryForDate = useCallback(async (date: Date) => {
    if (!activeJournal) return;
    const entry = await createEntry(activeJournal.rootPath, "", date, []);
    dispatch({ type: "ADD_ENTRY", entry });
    dispatch({ type: "SET_ACTIVE_ENTRY", entryId: entry.metadata.id });
    setActiveView("list");
  }, [activeJournal, dispatch]);

  return (
    <div className="flex-1 min-h-0 flex flex-row">
      {!isZenMode && sidebarEnabled && (navCollapsed ? (
        <div className="h-full shrink-0 border-r overflow-hidden" style={{ width: 48, borderColor: tConfig.uiBorderHex }}>
          <JournalNavigation
            t={t} tConfig={tConfig} activeSection={activeSection} onSectionChange={setActiveSection}
            activeView={activeView} onViewChange={setActiveView}
            journals={journals} activeJournalId={activeJournal?.id ?? null} activeJournal={activeJournal}
            onSelectJournal={(id) => { selectJournal(id); dispatch({ type: "SET_ACTIVE_ENTRY", entryId: null }); }}
            onCreateJournal={() => setShowCreateDialog(true)}
            onAddJournal={() => setShowAddDialog(true)}
            onNewEntry={handleNewEntry}
            onRelocateJournal={handleRelocate}
            onRemoveJournal={(id) => setRemoveTarget(journals.find((j) => j.id === id) ?? null)}
            onCustomizeJournal={(id) => setCustomizeId(id)}
            loading={sessionState.loading}
            collapsed={true} onToggleCollapse={() => setNavCollapsed(false)}
          />
        </div>
      ) : (
        <ResizablePanel initialWidth={sidebarWidthRef.current} minWidth={200} maxWidth={400} theme={tConfig} onWidthChange={handleSidebarWidthChange}>
          <div className="h-full overflow-hidden border-r" style={{ borderColor: tConfig.uiBorderHex }}>
            <JournalNavigation
              t={t} tConfig={tConfig} activeSection={activeSection} onSectionChange={setActiveSection}
              activeView={activeView} onViewChange={setActiveView}
              journals={journals} activeJournalId={activeJournal?.id ?? null} activeJournal={activeJournal}
              onSelectJournal={(id) => { selectJournal(id); dispatch({ type: "SET_ACTIVE_ENTRY", entryId: null }); }}
              onCreateJournal={() => setShowCreateDialog(true)}
              onAddJournal={() => setShowAddDialog(true)}
              onNewEntry={handleNewEntry}
              onRelocateJournal={handleRelocate}
              onRemoveJournal={(id) => setRemoveTarget(journals.find((j) => j.id === id) ?? null)}
            onCustomizeJournal={(id) => setCustomizeId(id)}
              loading={sessionState.loading}
              collapsed={false} onToggleCollapse={() => setNavCollapsed(true)}
            />
          </div>
        </ResizablePanel>
      ))}

      {!isZenMode && (
        <ResizablePanel initialWidth={380} minWidth={300} maxWidth={600} theme={tConfig}>
          <div className="h-full overflow-hidden">
            <JournalContextPanel
              t={t} tConfig={tConfig} activeView={activeView} onViewChange={setActiveView}
              activeSection={activeSection}
              journal={activeJournal} sessionState={sessionState}
              selectedEntryId={sessionState.activeEntryId}
              onSelectEntry={handleSelectEntry}
              onCreateEntryForDate={handleCreateEntryForDate}
              onNewEntry={handleNewEntry}
              onManageTemplates={() => setShowTemplateManager(true)}
              language={language}
              worldMapActive={showWorldMap}
              onToggleWorldMap={() => setShowWorldMap((v) => !v)}
            />
          </div>
        </ResizablePanel>
      )}

      <div className="flex-1 min-w-0 h-full flex flex-col">
        {activeView === "gallery" ? (
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ backgroundColor: tConfig.editorBgHex }}>
            <JournalGalleryView t={t} tConfig={tConfig} journal={activeJournal}
              entries={sessionState.entries} onSelectEntry={handleSelectEntryFromView} />
          </div>
        ) : activeView === "map" && showWorldMap ? (
          <div className="flex-1 min-h-0">
            <JournalAtlasMap entries={sessionState.entries} tConfig={tConfig} onSelectEntry={handleSelectEntry} t={t} />
          </div>
        ) : (
          <JournalEntryPanel
            t={t} tConfig={tConfig} journal={activeJournal} entry={activeEntry}
            viewMode={viewMode} readOnly={readOnly}
            onEntryUpdated={handleEntryUpdated}
            onOpenInEditor={onOpenFile}
            onDeleteEntry={handleDeleteEntry}
            onDuplicateEntry={handleDuplicateEntry}
            onReloadEntry={handleReloadEntry}
            onNewEntry={handleNewEntry}
            onCreateJournal={() => setShowCreateDialog(true)}
            onAddJournal={() => setShowAddDialog(true)}
            prevEntry={olderEntry}
            nextEntry={newerEntry}
            onNavigateEntry={handleSelectEntry}
            language={language}
            hasEntries={sessionState.entries.length > 0}
          />
        )}
      </div>

      <CreateJournalDialog open={showCreateDialog} t={t} tConfig={tConfig} defaultLanguage={language}
        journalDataDir={journalDataDir} onClose={() => setShowCreateDialog(false)} onCreated={addToLib} />
      <AddExistingJournalDialog open={showAddDialog} t={t} tConfig={tConfig}
        onClose={() => setShowAddDialog(false)} onAdded={addToLib} />
      <RemoveJournalDialog open={removeTarget !== null}
        journalName={removeTarget?.name ?? ""} journalPath={removeTarget?.rootPath ?? ""}
        tConfig={tConfig} onClose={() => setRemoveTarget(null)} onConfirm={handleRemoveConfirm} />
      <CustomizeJournalDialog open={customizeId !== null} t={t} tConfig={tConfig}
        journal={journals.find((j) => j.id === customizeId) ?? null}
        onClose={() => setCustomizeId(null)}
        onSaved={reload} />
      <TemplatePickerDialog open={showTemplatePicker} t={t}
        tConfig={tConfig} journalRootPath={activeJournal?.rootPath ?? ""}
        onClose={() => setShowTemplatePicker(false)} onSelect={handleCreateFromTemplate}
        onManageTemplates={() => setShowTemplateManager(true)} />
      <TemplateManagerDialog open={showTemplateManager}
        tConfig={tConfig} journalRootPath={activeJournal?.rootPath ?? ""}
        onClose={() => setShowTemplateManager(false)} />
    </div>
  );
}

export function JournalWorkspace(props: JournalWorkspaceProps) {
  const { journals, activeJournal, selectJournal, addJournal: addToLib, removeJournal: removeFromLib, reload } = useJournalLibrary();

  return (
    <JournalSessionProvider rootPath={activeJournal?.rootPath ?? null}>
      <JournalWorkspaceInner
        {...props}
        journals={journals}
        activeJournal={activeJournal}
        selectJournal={selectJournal}
        addToLib={addToLib}
        removeFromLib={removeFromLib}
        reload={reload}
      />
    </JournalSessionProvider>
  );
}
