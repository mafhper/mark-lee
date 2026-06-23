import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, FileText, Plus, Maximize2, Minimize2 } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { getExcerpt } from "../domain/entry-service";

interface JournalCalendarViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entries: EntryRecord[];
  onSelectEntry: (entry: EntryRecord) => void;
  onCreateEntryForDate?: (date: Date) => void;
  language?: string;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthDayNames(lang: string): string[] {
  try {
    const formatter = new Intl.DateTimeFormat(lang, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(new Date(2024, 0, 7 + i))
    );
  } catch {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
}

function useCalendarMonth(base: Date) {
  return useMemo(() => {
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startDow = first.getDay();
    const daysInMonth = last.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return { year: y, month: m, cells, daysInMonth };
  }, [base.getFullYear(), base.getMonth()]);
}

function dateFromDay(year: number, month: number, day: number): string {
  return toLocalDateKey(new Date(year, month, day));
}

function dayHasEntry(year: number, month: number, day: number, entries: EntryRecord[]): boolean {
  const target = dateFromDay(year, month, day);
  return entries.some((e) => e.metadata.date.slice(0, 10) === target);
}

function entriesForDay(year: number, month: number, day: number, entries: EntryRecord[]): EntryRecord[] {
  const target = dateFromDay(year, month, day);
  return entries.filter((e) => e.metadata.date.slice(0, 10) === target);
}

export function JournalCalendarView({ t, tConfig, journal, entries, onSelectEntry, onCreateEntryForDate, language = "en" }: JournalCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const cal = useCalendarMonth(cursor);
  const DAYS = useMemo(() => monthDayNames(language), [language]);

  const selectedEntries = selectedDay ? entriesForDay(cal.year, cal.month, selectedDay, entries) : [];

  const handlePrevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const handleNextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const handleToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  };

  const handleCreateEntry = () => {
    if (!journal || !selectedDay || !onCreateEntryForDate) return;
    const date = new Date(cal.year, cal.month, selectedDay);
    onCreateEntryForDate(date);
    setFocused(true);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let d = selectedDay ?? 1;
    if (e.key === "ArrowLeft") d = Math.max(1, d - 1);
    else if (e.key === "ArrowRight") d = Math.min(cal.daysInMonth, d + 1);
    else if (e.key === "ArrowUp") d = Math.max(1, d - 7);
    else if (e.key === "ArrowDown") d = Math.min(cal.daysInMonth, d + 7);
    else return;
    e.preventDefault();
    setSelectedDay(d);
  }, [selectedDay, cal.daysInMonth]);

  if (!journal) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: tConfig.fgHex + "50" }}>
        {t["journal.noJournalDesc"] || "Select a journal"}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
        <div className="flex items-center gap-1">
          {!focused && (
            <button type="button" onClick={handlePrevMonth} className="p-1 rounded hover:opacity-60" style={{ color: tConfig.fgHex + "60" }}>
              <ChevronLeft size={16} />
            </button>
          )}
          <button type="button" onClick={handleToday} className="text-xs font-medium hover:opacity-70" style={{ color: tConfig.fgHex }}>
            {focused && selectedDay
              ? new Date(cal.year, cal.month, selectedDay).toLocaleDateString(language, { weekday: "short", month: "long", day: "numeric", year: "numeric" })
              : cursor.toLocaleDateString(language, { month: "long", year: "numeric" })}
          </button>
          {!focused && (
            <button type="button" onClick={handleNextMonth} className="p-1 rounded hover:opacity-60" style={{ color: tConfig.fgHex + "60" }}>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedDay && (
            <button type="button" onClick={handleCreateEntry} className="p-1 rounded hover:opacity-60 flex items-center gap-1 text-[11px]"
              style={{ color: tConfig.accentHex }} title={t["journal.newEntry"] || "New entry"}>
              <Plus size={14} /> {t["journal.blankEntry"] || "New"}
            </button>
          )}
          {selectedDay && (
            <button type="button" onClick={() => setFocused(!focused)} className="p-1 rounded hover:opacity-60"
              style={{ color: tConfig.fgHex + "50" }} title={focused ? (t["journal.calendar"] || "Calendar") : (t["journal.list"] || "Day")}>
              {focused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </div>

      {!focused && (
        <>
          <div className="grid grid-cols-7 gap-px px-2 py-2 text-[10px] font-medium text-center" style={{ color: tConfig.fgHex + "50" }}>
            {DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px px-2 text-xs">
            {cal.cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const has = dayHasEntry(cal.year, cal.month, day, entries);
              const isSelected = selectedDay === day;
              const isToday = dateFromDay(cal.year, cal.month, day) === dateFromDay(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
              return (
                <button key={day} type="button" onClick={() => setSelectedDay(day)}
                  className="relative flex flex-col items-center justify-center rounded py-1.5 transition-colors hover:opacity-70"
                  style={{
                    backgroundColor: isSelected ? tConfig.accentHex + "20" : "transparent",
                    color: isSelected ? tConfig.accentHex : isToday ? tConfig.accentHex : tConfig.fgHex + "80",
                    fontWeight: isToday ? 600 : 400,
                  }}>
                  <span>{day}</span>
                  {has && <span className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: tConfig.accentHex }} />}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex-1 min-h-0 border-t overflow-y-auto" style={{ borderColor: tConfig.uiBorderHex }}>
        {selectedEntries.length > 0 ? (
          <div className="px-2 py-2 space-y-1">
            {selectedEntries.map((entry) => (
              <button key={entry.metadata.id} type="button" onClick={() => onSelectEntry(entry)}
                className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors hover:opacity-70"
                style={{ backgroundColor: tConfig.accentHex + "08", color: tConfig.fgHex }}>
                <div className="flex items-center gap-1.5">
                  <FileText size={11} className="shrink-0" style={{ color: tConfig.fgHex + "40" }} />
                  <span className="font-medium truncate">{entry.metadata.title || (t["journal.blankEntry"] || "Untitled")}</span>
                </div>
                {entry.body.trim() && (
                  <p className="truncate mt-0.5" style={{ color: tConfig.fgHex + "50" }}>{getExcerpt(entry.body, 60)}</p>
                )}
              </button>
            ))}
          </div>
        ) : selectedDay ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: tConfig.fgHex + "40" }}>
            {t["journal.emptyStateCalendar"] || "No entries for this day"}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: tConfig.fgHex + "40" }}>
            "Select a day"
          </div>
        )}
      </div>
    </div>
  );
}
