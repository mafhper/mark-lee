import React from "react";
import { BookOpen, Plus, Search, Calendar, MapPin } from "lucide-react";
import type { ThemeConfig } from "../../../types";

interface JournalHeaderProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  activeView: "list" | "calendar" | "map";
  onViewChange: (view: "list" | "calendar" | "map") => void;
  onNewEntry?: () => void;
}

export function JournalHeader({ t, tConfig, activeView, onViewChange, onNewEntry }: JournalHeaderProps) {
  const views: Array<{ id: "list" | "calendar" | "map"; label: string; icon: React.ReactNode }> = [
    { id: "list", label: t["journal.list"] || "List", icon: <BookOpen size={14} /> },
    { id: "calendar", label: t["journal.calendar"] || "Calendar", icon: <Calendar size={14} /> },
    { id: "map", label: t["journal.map"] || "Map", icon: <MapPin size={14} /> },
  ];

  return (
    <div
      className="px-4 py-3 border-b space-y-3"
      style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex }}
    >
      <div className="flex items-center gap-2 justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-8 w-8 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}
          >
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate" style={{ color: tConfig.fgHex }}>
              {t["journal.noJournalTitle"] || "No journal open"}
            </h2>
            <p className="text-xs truncate" style={{ color: tConfig.fgHex + "80" }}>
              {t["journal.noJournalDesc"] || "Create or add a journal to start journaling."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
            style={{
              color: tConfig.accentHex,
              borderColor: tConfig.accentHex + "40",
              backgroundColor: tConfig.accentHex + "10",
            }}
            title={t["journal.newJournal"] || "New journal"}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onViewChange(v.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeView === v.id ? "" : ""
            }`}
            style={
              activeView === v.id
                ? {
                    color: tConfig.accentHex,
                    backgroundColor: tConfig.accentHex + "18",
                  }
                : {
                    color: tConfig.fgHex + "80",
                    backgroundColor: "transparent",
                  }
            }
          >
            {v.icon}
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {onNewEntry && (
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              color: tConfig.accentHex,
              backgroundColor: tConfig.accentHex + "18",
            }}
            onClick={onNewEntry}
          >
            <Plus size={13} />
            <span className="hidden sm:inline">{t["journal.newEntry"] || "New entry"}</span>
          </button>
        )}
        <div
          className="relative flex-1 max-w-[160px] ml-2"
        >
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: tConfig.fgHex + "60" }}
          />
          <input
            type="text"
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded border outline-none bg-transparent"
            style={{
              borderColor: tConfig.uiBorderHex,
              color: tConfig.fgHex,
            }}
            placeholder={t["journal.search"] || "Search..."}
            disabled
          />
        </div>
      </div>
    </div>
  );
}
