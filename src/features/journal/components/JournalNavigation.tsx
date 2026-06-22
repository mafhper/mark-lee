import { BookOpen, Calendar, Heart, Settings, Search, FolderPlus } from "lucide-react";
import type { ThemeConfig } from "../../../types";

interface JournalNavigationProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function JournalNavigation({ t, tConfig, activeSection, onSectionChange }: JournalNavigationProps) {
  const topItems = [
    { id: "entries", label: t["journal.entries"] || "Entries", icon: <BookOpen size={15} /> },
    { id: "today", label: t["journal.today"] || "On this day", icon: <Calendar size={15} /> },
    { id: "favorites", label: t["journal.favorites"] || "Favorites", icon: <Heart size={15} /> },
  ];

  const bottomItems = [
    { id: "journals", label: t["journal.journals"] || "Journals", icon: <BookOpen size={15} /> },
  ];

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: tConfig.uiHex + "40" }}
    >
      <div className="p-3 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: tConfig.fgHex + "60" }}
          />
          <input
            type="text"
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded border outline-none bg-transparent"
            style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
            placeholder={t["journal.search"] || "Search..."}
            disabled
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {topItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left"
            style={{
              color: activeSection === item.id ? tConfig.accentHex : tConfig.fgHex + "CC",
              backgroundColor: activeSection === item.id ? tConfig.accentHex + "12" : "transparent",
              borderLeft: activeSection === item.id ? `2px solid ${tConfig.accentHex}` : "2px solid transparent",
            }}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        ))}

        <div className="mx-3 my-3 border-t" style={{ borderColor: tConfig.uiBorderHex }} />

        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider opacity-50" style={{ color: tConfig.fgHex }}>
          {bottomItems[0].label}
        </div>

        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left"
          style={{ color: tConfig.fgHex + "70" }}
        >
          <FolderPlus size={14} />
          <span className="truncate">{t["journal.newJournal"] || "New journal"}</span>
        </button>
      </nav>

      <div className="border-t p-2" style={{ borderColor: tConfig.uiBorderHex }}>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors"
          style={{ color: tConfig.fgHex + "80" }}
        >
          <Settings size={14} />
          <span className="truncate">{t["journal.settings"] || "Settings"}</span>
        </button>
      </div>
    </div>
  );
}
