import { useState, useMemo, useEffect, useRef } from "react";
import { BookOpen, Calendar, Heart, Plus, FolderPlus, AlertTriangle, PenLine, ChevronDown, ChevronRight, ChevronUp, Menu, Pin, Save, Tags as TagsIcon, ListTodo, RefreshCw } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { useContextMenu } from "../../../app/components/context-menu";
import { TrackerSummaryPanel } from "./TrackerSummaryPanel";
import { useJournalSession } from "../session/JournalSessionContext";
import { loadImage } from "../../../services/filesystem";
import { collectTagStats } from "../domain/tag-service";
import { listEntries } from "../domain/entry-service";
import { findFirstNotebookImage } from "../domain/entry-images";
import { JOURNAL_TASK_STATUSES, type JournalTaskStatus } from "../domain/journal-entry.types";
import { collectTaskStatusCounts } from "../domain/task-status";
import { orderJournalsForNavigation } from "../domain/journal-order";

/** Cover card: rectangular cover image (or colored monogram) + title + subtitle. */
function JournalCard({ journal, tConfig, active }: { journal: JournalDescriptor; tConfig: ThemeConfig; active: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let act = true;
    setUrl(null);
    if (journal.cover && !journal.unavailable) {
      loadImage(`${journal.rootPath}/${journal.cover}`).then((u) => { if (act) setUrl(u); }).catch(() => { if (act) setUrl(null); });
    } else if (!journal.unavailable) {
      listEntries(journal.rootPath)
        .then((result) => {
          if (!act) return;
          const fallback = findFirstNotebookImage(result.entries);
          if (!fallback) return setUrl(null);
          return loadImage(fallback.path).then((u) => { if (act) setUrl(u); }).catch(() => { if (act) setUrl(null); });
        })
        .catch(() => { if (act) setUrl(null); });
    }
    return () => { act = false; };
  }, [journal.cover, journal.rootPath, journal.unavailable]);

  const color = journal.color || tConfig.accentHex;
  const letter = (journal.name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height: 72 }}>
      {/* Background: cover image or gradient */}
      {url
        ? <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        : <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${color}55, ${color}22)`,
          }}>
            <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold opacity-25" style={{ color }}>
              {letter}
            </span>
          </div>
      }
      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.62) 100%)" }} />
      {/* Active indicator */}
      {active && <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ outline: `2px solid ${color}`, outlineOffset: -2 }} />}
      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5">
        <p className="truncate text-[12px] font-semibold leading-tight text-white drop-shadow-sm">{journal.name}</p>
        {journal.description && (
          <p className="truncate text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.72)" }}>{journal.description}</p>
        )}
      </div>
    </div>
  );
}

interface JournalNavigationProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeSection: string;
  onSectionChange: (section: string) => void;
  activeView: "list" | "calendar" | "map" | "gallery";
  onViewChange: (view: "list" | "calendar" | "map" | "gallery") => void;
  journals: JournalDescriptor[];
  activeJournalId: string | null;
  activeJournal?: JournalDescriptor | null;
  onSelectJournal: (id: string | null) => void;
  onCreateJournal: () => void;
  onAddJournal: () => void;
  onSaveActive?: () => void;
  onNewEntry?: () => void;
  onRelocateJournal: (journalId: string) => void;
  onRemoveJournal: (journalId: string) => void;
  onCustomizeJournal?: (journalId: string) => void;
  loading: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  filterTags?: string[];
  onFilterTagsChange?: (tags: string[]) => void;
  filterTaskStatus?: JournalTaskStatus | null;
  onFilterTaskStatusChange?: (status: JournalTaskStatus | null) => void;
  onReloadJournal?: () => void;
}

function AccordionSection({
  title, defaultOpen, children, tConfig, containerRef, openWhen,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  tConfig: ThemeConfig;
  containerRef?: (el: HTMLDivElement | null) => void;
  openWhen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen !== false);
  // Force-open (never force-close) when this section is the focus target of a
  // collapsed-rail icon click, so "expand + open section" lands on visible content.
  useEffect(() => {
    if (openWhen) setOpen(true);
  }, [openWhen]);
  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:opacity-80"
        style={{ color: tConfig.fgHex + "70" }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

export function JournalNavigation({
  t, tConfig, activeSection, onSectionChange, onViewChange,
  journals, activeJournalId, activeJournal, onSelectJournal, onCreateJournal, onAddJournal, onSaveActive, onNewEntry,
  onRelocateJournal, onRemoveJournal, onCustomizeJournal, collapsed = false, onToggleCollapse,
  filterTags = [], onFilterTagsChange,
  filterTaskStatus = null, onFilterTaskStatusChange, onReloadJournal,
}: JournalNavigationProps) {
  const { openContextMenu } = useContextMenu();
  const { state: sessionState } = useJournalSession();
  const [tagLines, setTagLines] = useState(2);
  const [showAllJournals, setShowAllJournals] = useState(false);

  // Collapsed-rail icons request a section: expand the bar, then scroll to and
  // open the matching accordion once the expanded layout has rendered.
  type SectionKey = "notebooks" | "navigation" | "tags" | "tasks" | "pins";
  const [focusSection, setFocusSection] = useState<SectionKey | null>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    notebooks: null, navigation: null, tags: null, tasks: null, pins: null,
  });

  const requestSection = (key: SectionKey) => {
    setFocusSection(key);
    if (collapsed) onToggleCollapse?.();
  };

  useEffect(() => {
    if (collapsed || !focusSection) return;
    sectionRefs.current[focusSection]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setFocusSection(null);
  }, [collapsed, focusSection]);

  const allTags = useMemo(() => {
    return collectTagStats(sessionState.entries);
  }, [sessionState.entries, sessionState.revision]);
  const taskCounts = useMemo(() => collectTaskStatusCounts(sessionState.entries), [sessionState.entries, sessionState.revision]);
  const orderedJournals = useMemo(
    () => orderJournalsForNavigation(journals, activeJournalId),
    [activeJournalId, journals],
  );
  const visibleJournals = showAllJournals ? orderedJournals : orderedJournals.slice(0, 3);
  const hiddenJournalCount = Math.max(0, orderedJournals.length - 3);

  useEffect(() => {
    if (journals.length <= 3) setShowAllJournals(false);
  }, [journals.length]);
  const taskStatusLabels: Record<JournalTaskStatus, string> = {
    pending: t["journal.task.pending"] || "Pendente",
    in_progress: t["journal.task.inProgress"] || "Em execução",
    completed: t["journal.task.completed"] || "Finalizada",
    cancelled: t["journal.task.cancelled"] || "Cancelada",
  };

  const sectionItems = [
    { id: "entries", label: t["journal.entries"] || "Posts", icon: <BookOpen size={15} /> },
    { id: "today", label: t["journal.today"] || "On this day", icon: <Calendar size={15} /> },
    { id: "favorites", label: t["journal.favorites"] || "Favorites", icon: <Heart size={15} /> },
  ];

  const handleJournalContextMenu = (event: React.MouseEvent, journal: JournalDescriptor) => {
    event.preventDefault();
    const items = [];
    if (onCustomizeJournal && !journal.unavailable) {
      items.push({
        type: "item" as const,
        id: "customize-journal",
        label: t["journal.customize"] || "Customize…",
        onSelect: () => onCustomizeJournal(journal.id),
      });
    }
    items.push({
      type: "item" as const,
      id: "remove-journal",
      label: t["journal.removeFromLibrary"] || "Remove from library",
      onSelect: () => onRemoveJournal(journal.id),
    });
    openContextMenu({ anchor: { type: "point", x: event.clientX, y: event.clientY }, items });
  };

  const LINE_HEIGHT = 22;
  const maxTagHeight = tagLines * LINE_HEIGHT;

  const iconStrip = (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        type="button" onClick={() => requestSection("notebooks")}
        className="p-1.5 rounded transition-colors hover:opacity-70"
        style={{ color: tConfig.fgHex + "60" }}
        title={t["journal.journals"] || "Notebooks"}
      >
        <BookOpen size={16} />
      </button>
      {sectionItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            onSectionChange(item.id);
            if (item.id === "entries") onViewChange("list");
            requestSection("navigation");
          }}
          className="p-1.5 rounded transition-colors"
          style={{
            color: activeSection === item.id ? tConfig.accentHex : tConfig.fgHex + "60",
            backgroundColor: activeSection === item.id ? tConfig.accentHex + "12" : "transparent",
          }}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
      {allTags.length > 0 && (
        <button
          type="button" onClick={() => requestSection("tags")}
          className="p-1.5 rounded transition-colors hover:opacity-70"
          style={{ color: filterTags.length > 0 ? tConfig.accentHex : tConfig.fgHex + "60", backgroundColor: filterTags.length > 0 ? tConfig.accentHex + "12" : "transparent" }}
          title={t["journal.tags"] || "Tags"}
        >
          <TagsIcon size={16} />
        </button>
      )}
      <button
        type="button" onClick={() => requestSection("tasks")}
        className="p-1.5 rounded transition-colors hover:opacity-70"
        style={{ color: filterTaskStatus ? tConfig.accentHex : tConfig.fgHex + "60", backgroundColor: filterTaskStatus ? tConfig.accentHex + "12" : "transparent" }}
        title={t["journal.tasks"] || "Tarefas"}
      >
        <ListTodo size={16} />
      </button>
      <button
        type="button" onClick={() => requestSection("pins")}
        className="p-1.5 rounded transition-colors hover:opacity-70"
        style={{ color: tConfig.fgHex + "60" }}
        title={t["journal.pins"] || "Pins"}
      >
        <Pin size={16} />
      </button>
    </div>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col h-full items-center pt-1"
        style={{ backgroundColor: tConfig.uiHex + "40" }}
      >
        <button
          type="button" onClick={onToggleCollapse}
          className="p-1.5 rounded transition-colors hover:opacity-70 mt-2"
          style={{ color: tConfig.fgHex + "60" }}
          title="Expand"
        >
          <Menu size={16} />
        </button>
        {iconStrip}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: tConfig.uiHex + "40" }}
    >
      <div className="flex items-center px-3 py-2">
        <button
          type="button" onClick={onToggleCollapse}
          className="p-1.5 rounded transition-colors hover:opacity-70"
          style={{ color: tConfig.fgHex + "60" }}
          title={t["journal.settings"] || "Collapse"}
        >
          <Menu size={16} />
        </button>
      </div>
      <div className="px-3 pb-3">
        {onNewEntry && activeJournal && (
          <button type="button" onClick={onNewEntry}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            <PenLine size={15} />
            <span className="truncate">{t["journal.newEntry"] || "Novo registro"}</span>
          </button>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          <button type="button" onClick={onSaveActive}
            className="flex h-8 items-center justify-center rounded-md border transition-opacity hover:opacity-80 disabled:opacity-35"
            style={{ color: tConfig.fgHex + "86", borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex + "80" }}
            disabled={!onSaveActive}
            title={t["journal.save"] || "Salvar"}>
            <Save size={14} />
          </button>
          <button type="button" onClick={onCreateJournal}
            className="flex h-8 items-center justify-center rounded-md border transition-opacity hover:opacity-80"
            style={{ color: tConfig.fgHex + "86", borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex + "80" }}
            title={t["journal.newJournal"] || "Novo caderno"}>
            <Plus size={14} />
          </button>
          <button type="button" onClick={onAddJournal}
            className="flex h-8 items-center justify-center rounded-md border transition-opacity hover:opacity-80"
            style={{ color: tConfig.fgHex + "86", borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex + "80" }}
            title={t["journal.addJournal"] || "Adicionar caderno"}>
            <FolderPlus size={15} />
          </button>
          <button type="button" onClick={onReloadJournal} disabled={!activeJournal || !onReloadJournal}
            className="flex h-8 items-center justify-center rounded-md border transition-opacity hover:opacity-80 disabled:opacity-35"
            style={{ color: tConfig.fgHex + "86", borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex + "80" }}
            title={t["journal.refresh"] || "Atualizar caderno"}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AccordionSection title={t["journal.journals"] || "Notebooks"} tConfig={tConfig}
          containerRef={(el) => { sectionRefs.current.notebooks = el; }} openWhen={focusSection === "notebooks"}>
          {journals.length === 0 && (
            <div className="px-3 py-2 text-[13px]" style={{ color: tConfig.fgHex + "50" }}>
              {t["journal.noBlogs"] || "No notebooks yet."}
            </div>
          )}

          {visibleJournals.map((journal) => {
            const active = activeJournalId === journal.id;
            return (
              <div key={journal.id} className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => {
                    if (journal.unavailable) {
                      onRelocateJournal(journal.id);
                    } else {
                      onSelectJournal(journal.id);
                    }
                  }}
                  onContextMenu={(e) => handleJournalContextMenu(e, journal)}
                  className="w-full text-left transition-opacity hover:opacity-90"
                  title={journal.unavailable ? `Pasta não encontrada: ${journal.rootPath}\nClique para relocar.` : journal.rootPath}
                >
                  {journal.unavailable
                    ? <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px]"
                        style={{ borderColor: "#f59e0b55", backgroundColor: "#f59e0b0F", color: "#f59e0b" }}>
                        <AlertTriangle size={14} />
                        <span className="truncate font-medium">{journal.name}</span>
                      </div>
                    : <JournalCard journal={journal} tConfig={tConfig} active={active} />
                  }
                </button>
              </div>
            );
          })}
          {hiddenJournalCount > 0 && (
            <button type="button" onClick={() => setShowAllJournals((value) => !value)}
              className="mx-3 mt-1 flex items-center gap-1 rounded px-1 py-1 text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: tConfig.fgHex + "70" }}
              aria-expanded={showAllJournals}>
              {showAllJournals ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {showAllJournals
                ? (t["journal.showFewerJournals"] || "Mostrar menos")
                : `${t["journal.showAllJournals"] || "Mostrar todos"} (${hiddenJournalCount})`}
            </button>
          )}
        </AccordionSection>

        <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />

        <AccordionSection title={t["journal.entries"] || "Navigation"} tConfig={tConfig}
          containerRef={(el) => { sectionRefs.current.navigation = el; }} openWhen={focusSection === "navigation"}>
          {sectionItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSectionChange(item.id);
                if (item.id === "entries") onViewChange("list");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors text-left"
              style={{
                color: activeSection === item.id ? tConfig.accentHex : tConfig.fgHex + "CC",
                backgroundColor: activeSection === item.id ? tConfig.accentHex + "12" : "transparent",
              }}
            >
              {item.icon}
              <span className="truncate flex-1">{item.label}</span>
            </button>
          ))}
        </AccordionSection>

        {allTags.length > 0 && (
          <>
            <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />
            <AccordionSection title={t["journal.tags"] || "Tags"} tConfig={tConfig}
              containerRef={(el) => { sectionRefs.current.tags = el; }} openWhen={focusSection === "tags"}>
              <div className="px-3 py-1">
                <div
                  className="flex flex-wrap gap-1 overflow-hidden transition-all"
                  style={{ maxHeight: `${maxTagHeight}px` }}
                >
                  {allTags.map(({ tag, count }) => {
                    const active = filterTags.includes(tag);
                    return (
                    <button key={tag} type="button"
                      onClick={() => {
                        onFilterTagsChange?.(active ? filterTags.filter((item) => item !== tag) : [...filterTags, tag]);
                        onSectionChange("entries");
                        onViewChange("list");
                      }}
                      aria-pressed={active}
                      className="px-1.5 py-0.5 rounded text-[11px] leading-tight inline-flex items-center gap-1 transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: active ? tConfig.accentHex + "2E" : tConfig.accentHex + "12",
                        color: active ? tConfig.accentHex : tConfig.fgHex + "85",
                        border: `1px solid ${active ? tConfig.accentHex + "55" : "transparent"}`,
                      }}
                    >
                      {tag}
                      <span className="tabular-nums opacity-60">{count}</span>
                    </button>
                  );})}
                </div>
                {filterTags.length > 0 && (
                  <button type="button" onClick={() => onFilterTagsChange?.([])}
                    className="mt-1 text-[11px] font-medium transition-colors hover:opacity-70"
                    style={{ color: tConfig.fgHex + "55" }}>
                    {t["journal.clear"] || "Clear"}
                  </button>
                )}
                {allTags.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setTagLines(tagLines === 2 ? 999 : 2)}
                    className="mt-1 text-[11px] font-medium flex items-center gap-1 transition-colors hover:opacity-70"
                    style={{ color: tConfig.fgHex + "50" }}
                  >
                    {tagLines === 2 ? <>More <ChevronDown size={10} /></> : <>Less <ChevronUp size={10} /></>}
                  </button>
                )}
              </div>
            </AccordionSection>
          </>
        )}
        <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />
        <AccordionSection title={t["journal.tasks"] || "Tarefas"} tConfig={tConfig}
          containerRef={(el) => { sectionRefs.current.tasks = el; }} openWhen={focusSection === "tasks"}>
          <div className="px-3 py-1 space-y-0.5">
            {JOURNAL_TASK_STATUSES.map((status) => {
              const active = filterTaskStatus === status;
              return (
                <button key={status} type="button" aria-pressed={active}
                  onClick={() => {
                    onFilterTaskStatusChange?.(active ? null : status);
                    onSectionChange("entries");
                    onViewChange("list");
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-80"
                  style={{ color: active ? tConfig.accentHex : tConfig.fgHex + "B5", backgroundColor: active ? tConfig.accentHex + "14" : "transparent" }}>
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? tConfig.accentHex : tConfig.uiBorderHex }} />
                  <span className="flex-1 truncate">{taskStatusLabels[status]}</span>
                  <span className="tabular-nums" style={{ color: tConfig.fgHex + "55" }}>{taskCounts[status]}</span>
                </button>
              );
            })}
            {Object.values(taskCounts).every((count) => count === 0) && (
              <p className="px-2 py-1 text-[11px]" style={{ color: tConfig.fgHex + "55" }}>{t["journal.noTasks"] || "Nenhuma memória marcada como tarefa."}</p>
            )}
          </div>
        </AccordionSection>
      </div>

      <div className="shrink-0 border-t" style={{ borderColor: tConfig.uiBorderHex }}>
        <AccordionSection title={t["journal.pins"] || "Pins"} tConfig={tConfig}
          containerRef={(el) => { sectionRefs.current.pins = el; }} openWhen={focusSection === "pins"}>
          {activeJournal && (
            <TrackerSummaryPanel t={t} tConfig={tConfig} journal={activeJournal} />
          )}
        </AccordionSection>
      </div>
    </div>
  );
}
