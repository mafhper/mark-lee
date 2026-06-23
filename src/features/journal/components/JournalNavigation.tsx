import { useState, useMemo } from "react";
import { BookOpen, Calendar, Heart, Plus, FolderOpen, AlertTriangle, PenLine, ChevronDown, ChevronRight, ChevronUp, Menu, Pin, Tags as TagsIcon } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { useContextMenu } from "../../../app/components/context-menu";
import { TrackerSummaryPanel } from "./TrackerSummaryPanel";
import { useJournalSession } from "../session/JournalSessionContext";

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
  onNewEntry?: () => void;
  onRelocateJournal: (journalId: string) => void;
  onRemoveJournal: (journalId: string) => void;
  loading: boolean;
}

function AccordionSection({
  title, defaultOpen, children, tConfig,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  tConfig: ThemeConfig;
}) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div>
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
  journals, activeJournalId, activeJournal, onSelectJournal, onCreateJournal, onAddJournal, onNewEntry,
  onRelocateJournal, onRemoveJournal, loading,
}: JournalNavigationProps) {
  const { openContextMenu } = useContextMenu();
  const { state: sessionState } = useJournalSession();
  const [tagLines, setTagLines] = useState(2);
  const [collapsed, setCollapsed] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const e of sessionState.entries) {
      for (const tag of e.metadata.tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }, [sessionState.entries, sessionState.revision]);

  const sectionItems = [
    { id: "entries", label: t["journal.entries"] || "Posts", icon: <BookOpen size={15} /> },
    { id: "today", label: t["journal.today"] || "On this day", icon: <Calendar size={15} /> },
    { id: "favorites", label: t["journal.favorites"] || "Favorites", icon: <Heart size={15} /> },
  ];

  const handleJournalContextMenu = (event: React.MouseEvent, journal: JournalDescriptor) => {
    event.preventDefault();
    openContextMenu({
      anchor: { type: "point", x: event.clientX, y: event.clientY },
      items: [
        {
          type: "item",
          id: "remove-journal",
          label: "Remove from library",
          onSelect: () => onRemoveJournal(journal.id),
        },
      ],
    });
  };

  const LINE_HEIGHT = 22;
  const maxTagHeight = tagLines * LINE_HEIGHT;

  const iconStrip = (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        type="button" onClick={() => setCollapsed(false)}
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
            setCollapsed(false);
            onSectionChange(item.id);
            if (item.id === "entries") onViewChange("list");
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
          type="button" onClick={() => setCollapsed(false)}
          className="p-1.5 rounded transition-colors hover:opacity-70"
          style={{ color: tConfig.fgHex + "60" }}
          title={t["journal.tags"] || "Tags"}
        >
          <TagsIcon size={16} />
        </button>
      )}
      <button
        type="button" onClick={() => setCollapsed(false)}
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
      <div
        className="flex flex-col h-full items-center"
        style={{ backgroundColor: tConfig.uiHex + "40" }}
      >
        <div className="w-full flex justify-center pt-3 pb-1">
          <button
            type="button" onClick={() => setCollapsed(false)}
            className="p-1.5 rounded transition-colors hover:opacity-70"
            style={{ color: tConfig.fgHex + "60" }}
            title={t["journal.settings"] || "Expand"}
          >
            <Menu size={16} />
          </button>
        </div>
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
          type="button" onClick={() => setCollapsed(true)}
          className="p-1.5 rounded transition-colors hover:opacity-70"
          style={{ color: tConfig.fgHex + "60" }}
          title={t["journal.settings"] || "Collapse"}
        >
          <Menu size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AccordionSection title={t["journal.journals"] || "Notebooks"} tConfig={tConfig}>
          <div className="flex items-center gap-1 px-3 py-1">
            <button
              type="button" onClick={onCreateJournal}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }}
              title={t["journal.newJournal"] || "New notebook"}
            >
              <Plus size={14} />
            </button>
            <button
              type="button" onClick={onAddJournal}
              className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }}
              title={t["journal.addJournal"] || "Add notebook"}
            >
              <FolderOpen size={14} />
            </button>
            <span className="text-[10px] ml-1" style={{ color: tConfig.fgHex + "40" }}>
              {t["journal.newJournal"] || "New"}
            </span>
            <span className="text-[10px]" style={{ color: tConfig.fgHex + "40" }}>/</span>
            <span className="text-[10px]" style={{ color: tConfig.fgHex + "40" }}>
              {t["journal.addJournal"] || "Add"}
            </span>
          </div>

          {loading && (
            <div className="px-3 py-2 text-xs" style={{ color: tConfig.fgHex + "50" }}>
              {t["journal.search"] || "Loading..."}
            </div>
          )}

          {!loading && journals.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: tConfig.fgHex + "50" }}>
              {t["journal.noBlogs"] || "No notebooks yet."}
            </div>
          )}

          {journals.map((journal) => (
            <button
              key={journal.id}
              type="button"
              onClick={() => {
                if (journal.unavailable) {
                  onRelocateJournal(journal.id);
                } else {
                  onSelectJournal(journal.id);
                }
              }}
              onContextMenu={(e) => handleJournalContextMenu(e, journal)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left group"
              style={{
                color: journal.unavailable
                  ? "#f59e0b"
                  : activeJournalId === journal.id
                    ? tConfig.accentHex
                    : tConfig.fgHex + "CC",
                backgroundColor: activeJournalId === journal.id ? tConfig.accentHex + "12" : "transparent",
                borderLeft: activeJournalId === journal.id ? `2px solid ${tConfig.accentHex}` : "2px solid transparent",
              }}
              title={journal.unavailable ? `Folder not found: ${journal.rootPath}\nClick to relocate.` : journal.rootPath}
            >
              {journal.unavailable ? <AlertTriangle size={15} /> : <BookOpen size={15} />}
              <span className="truncate">{journal.name}</span>
            </button>
          ))}
        </AccordionSection>

        <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />

        <AccordionSection title={t["journal.entries"] || "Navigation"} tConfig={tConfig}>
          {sectionItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSectionChange(item.id);
                if (item.id === "entries") onViewChange("list");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left"
              style={{
                color: activeSection === item.id ? tConfig.accentHex : tConfig.fgHex + "CC",
                backgroundColor: activeSection === item.id ? tConfig.accentHex + "12" : "transparent",
                borderLeft: activeSection === item.id ? `2px solid ${tConfig.accentHex}` : "2px solid transparent",
              }}
            >
              {item.icon}
              <span className="truncate flex-1">{item.label}</span>
            </button>
          ))}
          {onNewEntry && activeJournal && (
            <button
              type="button"
              onClick={onNewEntry}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left"
              style={{
                color: tConfig.accentHex,
              }}
            >
              <PenLine size={15} />
              <span className="truncate flex-1">{t["journal.newEntry"] || "New entry"}</span>
            </button>
          )}
        </AccordionSection>

        {allTags.length > 0 && (
          <>
            <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />
            <AccordionSection title={t["journal.tags"] || "Tags"} tConfig={tConfig}>
              <div className="px-3 py-1">
                <div
                  className="flex flex-wrap gap-1 overflow-hidden transition-all"
                  style={{ maxHeight: `${maxTagHeight}px` }}
                >
                  {allTags.map((tag) => (
                    <span key={tag}
                      className="px-1.5 py-0.5 rounded text-[11px] leading-tight"
                      style={{ backgroundColor: tConfig.accentHex + "12", color: tConfig.accentHex }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {allTags.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setTagLines(tagLines === 2 ? 999 : 2)}
                    className="mt-1 text-[10px] font-medium flex items-center gap-1 transition-colors hover:opacity-70"
                    style={{ color: tConfig.fgHex + "50" }}
                  >
                    {tagLines === 2 ? <>More <ChevronDown size={10} /></> : <>Less <ChevronUp size={10} /></>}
                  </button>
                )}
              </div>
            </AccordionSection>
          </>
        )}
      </div>

      <div className="shrink-0 border-t" style={{ borderColor: tConfig.uiBorderHex }}>
        <AccordionSection title={t["journal.pins"] || "Pins"} tConfig={tConfig}>
          {activeJournal && (
            <TrackerSummaryPanel tConfig={tConfig} journal={activeJournal} />
          )}
        </AccordionSection>
      </div>
    </div>
  );
}
