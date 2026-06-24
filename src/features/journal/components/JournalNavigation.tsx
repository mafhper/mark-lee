import { useState, useMemo, useEffect, useRef } from "react";
import { BookOpen, Calendar, Heart, Plus, FolderPlus, AlertTriangle, PenLine, ChevronDown, ChevronRight, ChevronUp, Menu, Pin, Tags as TagsIcon } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { useContextMenu } from "../../../app/components/context-menu";
import { TrackerSummaryPanel } from "./TrackerSummaryPanel";
import { useJournalSession } from "../session/JournalSessionContext";
import { loadImage } from "../../../services/filesystem";

/** Cover thumbnail when set, otherwise a colored monogram of the notebook name. */
function JournalAvatar({ journal, size = 22, tConfig }: { journal: JournalDescriptor; size?: number; tConfig: ThemeConfig }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUrl(null);
    if (journal.cover && !journal.unavailable) {
      loadImage(`${journal.rootPath}/${journal.cover}`).then((u) => { if (active) setUrl(u); }).catch(() => { if (active) setUrl(null); });
    }
    return () => { active = false; };
  }, [journal.cover, journal.rootPath, journal.unavailable]);

  const color = journal.color || tConfig.accentHex;
  const letter = (journal.name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="shrink-0 rounded-md overflow-hidden flex items-center justify-center font-semibold"
      style={{ width: size, height: size, backgroundColor: url ? "transparent" : color + "26", color }}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: size * 0.5 }}>{letter}</span>}
    </span>
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
  onNewEntry?: () => void;
  onRelocateJournal: (journalId: string) => void;
  onRemoveJournal: (journalId: string) => void;
  onCustomizeJournal?: (journalId: string) => void;
  loading: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  journals, activeJournalId, activeJournal, onSelectJournal, onCreateJournal, onAddJournal, onNewEntry,
  onRelocateJournal, onRemoveJournal, onCustomizeJournal, loading, collapsed = false, onToggleCollapse,
}: JournalNavigationProps) {
  const { openContextMenu } = useContextMenu();
  const { state: sessionState } = useJournalSession();
  const [tagLines, setTagLines] = useState(2);

  // Collapsed-rail icons request a section: expand the bar, then scroll to and
  // open the matching accordion once the expanded layout has rendered.
  type SectionKey = "notebooks" | "navigation" | "tags" | "pins";
  const [focusSection, setFocusSection] = useState<SectionKey | null>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    notebooks: null, navigation: null, tags: null, pins: null,
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
          style={{ color: tConfig.fgHex + "60" }}
          title={t["journal.tags"] || "Tags"}
        >
          <TagsIcon size={16} />
        </button>
      )}
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
      <div className="flex-1 overflow-y-auto">
        <AccordionSection title={t["journal.journals"] || "Notebooks"} tConfig={tConfig}
          containerRef={(el) => { sectionRefs.current.notebooks = el; }} openWhen={focusSection === "notebooks"}>
          <div className="px-3 py-1.5 space-y-1">
            <button type="button" onClick={onCreateJournal}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors hover:opacity-90"
              style={{ color: "#fff", backgroundColor: tConfig.accentHex }}
              title={t["journal.newJournal"] || "New notebook"}>
              <Plus size={14} className="shrink-0" />
              <span className="truncate">{t["journal.newJournal"] || "New notebook"}</span>
            </button>
            <button type="button" onClick={onAddJournal}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors hover:opacity-80"
              style={{ color: tConfig.fgHex + "90", border: `1px solid ${tConfig.uiBorderHex}` }}
              title={t["journal.addJournal"] || "Add notebook"}>
              <FolderPlus size={14} className="shrink-0" />
              <span className="truncate">{t["journal.addJournal"] || "Add notebook"}</span>
            </button>
          </div>

          {loading && (
            <div className="px-3 py-2 text-[13px]" style={{ color: tConfig.fgHex + "50" }}>
              {t["journal.search"] || "Loading..."}
            </div>
          )}

          {!loading && journals.length === 0 && (
            <div className="px-3 py-2 text-[13px]" style={{ color: tConfig.fgHex + "50" }}>
              {t["journal.noBlogs"] || "No notebooks yet."}
            </div>
          )}

          {journals.map((journal) => {
            const active = activeJournalId === journal.id;
            const accent = journal.color || tConfig.accentHex;
            return (
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
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors text-left group"
                style={{
                  color: journal.unavailable ? "#f59e0b" : active ? accent : tConfig.fgHex + "CC",
                  backgroundColor: active ? accent + "14" : "transparent",
                  borderLeft: active ? `2px solid ${accent}` : "2px solid transparent",
                }}
                title={journal.unavailable ? `Folder not found: ${journal.rootPath}\nClick to relocate.` : journal.rootPath}
              >
                {journal.unavailable
                  ? <span className="shrink-0 h-[22px] w-[22px] flex items-center justify-center"><AlertTriangle size={15} /></span>
                  : <JournalAvatar journal={journal} tConfig={tConfig} />}
                <span className="truncate">{journal.name}</span>
              </button>
            );
          })}
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
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors text-left"
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
            <AccordionSection title={t["journal.tags"] || "Tags"} tConfig={tConfig}
              containerRef={(el) => { sectionRefs.current.tags = el; }} openWhen={focusSection === "tags"}>
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
