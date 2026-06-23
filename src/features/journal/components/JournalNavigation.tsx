import { useState, useEffect } from "react";
import { BookOpen, Calendar, Heart, Plus, FolderOpen, AlertTriangle, PenLine, MapPin, LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { listEntries } from "../domain/entry-service";
import { useContextMenu } from "../../../app/components/context-menu";
import { TrackerSummaryPanel } from "./TrackerSummaryPanel";

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
  entryCount?: number;
  favoriteCount?: number;
  imageCount?: number;
  locationCount?: number;
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
  t, tConfig, activeSection, onSectionChange, activeView, onViewChange,
  journals, activeJournalId, activeJournal, onSelectJournal, onCreateJournal, onAddJournal, onNewEntry,
  onRelocateJournal, onRemoveJournal, loading,
}: JournalNavigationProps) {
  const { openContextMenu } = useContextMenu();
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (!activeJournal) { setAllTags([]); return; }
    listEntries(activeJournal.rootPath).then((r) => {
      const tagSet = new Set<string>();
      for (const e of r.entries) {
        for (const tag of e.metadata.tags) tagSet.add(tag);
      }
      setAllTags(Array.from(tagSet).sort());
    }).catch(() => setAllTags([]));
  }, [activeJournal?.rootPath]);

  const navItems = [
    { id: "entries", label: t["journal.entries"] || "Posts", icon: <BookOpen size={15} />, section: "entries" as const },
    { id: "today", label: t["journal.today"] || "On this day", icon: <Calendar size={15} />, section: "today" as const },
    { id: "favorites", label: t["journal.favorites"] || "Favorites", icon: <Heart size={15} />, section: "favorites" as const },
    { id: "view-list", label: t["journal.list"] || "List", icon: <BookOpen size={15} />, view: "list" as const, section: "entries" as const },
    { id: "view-calendar", label: t["journal.calendar"] || "Calendar", icon: <Calendar size={15} />, view: "calendar" as const },
    { id: "view-gallery", label: "Gallery", icon: <LayoutGrid size={15} />, view: "gallery" as const },
    { id: "view-map", label: t["journal.map"] || "Map", icon: <MapPin size={15} />, view: "map" as const },
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

  const isActive = (item: typeof navItems[0]) => {
    if ("section" in item && item.section && item.section !== "entries") {
      return activeSection === item.section;
    }
    if ("view" in item && item.view) {
      return activeView === item.view;
    }
    return activeSection === item.section && activeView === "list";
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: tConfig.uiHex + "40" }}
    >
      <nav className="flex-1 overflow-y-auto py-2">
        <AccordionSection title={t["journal.entries"] || "Navigation"} tConfig={tConfig}>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if ("section" in item && item.section) {
                  onSectionChange(item.section);
                }
                if ("view" in item && item.view) {
                  onViewChange(item.view);
                } else {
                  onViewChange("list");
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left"
              style={{
                color: isActive(item) ? tConfig.accentHex : tConfig.fgHex + "CC",
                backgroundColor: isActive(item) ? tConfig.accentHex + "12" : "transparent",
                borderLeft: isActive(item) ? `2px solid ${tConfig.accentHex}` : "2px solid transparent",
              }}
            >
              {item.icon}
              <span className="truncate flex-1">{item.label}</span>
            </button>
          ))}
        </AccordionSection>

        <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />

        <AccordionSection title={t["journal.journals"] || "Blogs"} tConfig={tConfig}>
          <div className="flex items-center gap-1 px-3 py-1">
            <button
              type="button" onClick={onCreateJournal}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }}
            >
              <Plus size={12} />
              <span>{t["journal.newJournal"] || "New blog"}</span>
            </button>
            <button
              type="button" onClick={onAddJournal}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-colors hover:opacity-70"
              style={{ color: tConfig.fgHex + "60" }}
            >
              <FolderOpen size={12} />
              <span>{t["journal.addJournal"] || "Add"}</span>
            </button>
          </div>

          {loading && (
            <div className="px-3 py-2 text-xs" style={{ color: tConfig.fgHex + "50" }}>
              Loading...
            </div>
          )}

          {!loading && journals.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: tConfig.fgHex + "50" }}>
              {t["journal.noJournalDesc"] || "No blogs yet."}
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

          {onNewEntry && activeJournal && (
            <>
              <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />
              <button
                type="button"
                onClick={onNewEntry}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors text-left"
                style={{ color: tConfig.accentHex }}
              >
                <PenLine size={14} />
                <span>{t["journal.newEntry"] || "New post"}</span>
              </button>
            </>
          )}
        </AccordionSection>

        {allTags.length > 0 && (
          <>
            <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />
            <AccordionSection title="Tags" tConfig={tConfig}>
              <div className="px-3 py-1 flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <span key={tag}
                    className="px-1.5 py-0.5 rounded text-[11px]"
                    style={{ backgroundColor: tConfig.accentHex + "12", color: tConfig.accentHex }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </AccordionSection>
          </>
        )}

        <div className="mx-3 my-2 border-t" style={{ borderColor: tConfig.uiBorderHex }} />
        <AccordionSection title="Trackers" tConfig={tConfig}>
          {activeJournal && (
            <TrackerSummaryPanel tConfig={tConfig} journal={activeJournal} />
          )}
        </AccordionSection>
      </nav>
    </div>
  );
}
