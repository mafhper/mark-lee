import { useState, useEffect, useMemo } from "react";
import { Activity, Droplets, Dumbbell, Moon, TrendingUp, Inbox, Flame, PencilLine, SlidersHorizontal, Plus, Minus, Check } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { TrackerDefinition, JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { createEntry, readEntry, saveEntry } from "../domain/entry-service";
import { readManifest, setPinnedMetrics } from "../domain/manifest-service";
import { useJournalSession } from "../session/JournalSessionContext";

interface TrackerSummaryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor;
}

type FocusPeriod = "day" | "week" | "month" | "all";

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateRange(focus: FocusPeriod): [Date, Date] {
  const now = new Date();
  switch (focus) {
    case "day": {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      return [d, e];
    }
    case "week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.getFullYear(), now.getMonth(), diff); mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
      return [mon, sun];
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return [s, e];
    }
    case "all":
      return [new Date(0), new Date(8640000000000000)];
  }
}

function computeStreak(entries: EntryRecord[]): number {
  const days = new Set(entries.map((e) => localDateKey(new Date(e.metadata.date))));
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1); // today may not be written yet
  let streak = 0;
  while (days.has(localDateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "mood-score": <TrendingUp size={13} />,
  "water": <Droplets size={13} />,
  "sleep": <Moon size={13} />,
  "exercise": <Dumbbell size={13} />,
};

interface Pin {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  pct: number;
  color?: string;
  adjust?: TrackerDefinition; // numeric tracker that supports inline +/- on today
}

export function TrackerSummaryPanel({ t, tConfig, journal }: TrackerSummaryPanelProps) {
  const { state: session, dispatch } = useJournalSession();
  const [focus, setFocus] = useState<FocusPeriod>("month");
  const [defs, setDefs] = useState<TrackerDefinition[]>([]);
  const [pinned, setPinned] = useState<string[] | null>(null); // null = use defaults
  const [showPicker, setShowPicker] = useState(false);
  const [busyAdjust, setBusyAdjust] = useState<string | null>(null);

  const entries = session.entries;

  useEffect(() => {
    let active = true;
    readManifest(journal.rootPath).then((m) => {
      if (!active) return;
      setDefs(m?.trackerDefinitions ?? []);
      setPinned(m?.pinnedMetrics ?? null);
    }).catch(() => { if (active) { setDefs([]); setPinned(null); } });
    return () => { active = false; };
  }, [journal.rootPath, session.revision]);

  const filtered = useMemo(() => {
    const [start, end] = getDateRange(focus);
    return entries.filter((e) => { const d = new Date(e.metadata.date); return d >= start && d <= end; });
  }, [entries, focus]);

  // Build every available pin (derived metrics + non-text trackers).
  const allPins = useMemo<Pin[]>(() => {
    const pins: Pin[] = [];

    const streak = computeStreak(entries);
    const daysLabel = streak === 1 ? (t["tracker.dayUnit"] || "day") : (t["tracker.days"] || "days");
    pins.push({ id: "metric:streak", label: t["tracker.streak"] || "Streak", icon: <Flame size={13} />, value: `${streak} ${daysLabel}`, pct: 0, color: "#f97316" });

    const totalWords = filtered.reduce((sum, e) => sum + (e.wordCount || 0), 0);
    pins.push({ id: "metric:words", label: t["tracker.words"] || "Words", icon: <PencilLine size={13} />, value: `${totalWords}`, pct: 0, color: "#3b82f6" });

    pins.push({ id: "metric:entries", label: t["journal.entries"] || "Entries", icon: <Inbox size={13} />, value: `${filtered.length}`, pct: 0, color: tConfig.accentHex });

    for (const def of defs) {
      if (def.type === "string") continue; // text can't be summarized
      if (def.type === "boolean") {
        let trues = 0;
        for (const e of filtered) if (e.metadata.trackers?.[def.id] === true) trues++;
        pins.push({
          id: `tracker:${def.id}`, label: def.name, icon: ICON_MAP[def.id] ?? <Activity size={13} />,
          value: filtered.length > 0 ? `${trues}/${filtered.length}` : "—",
          pct: filtered.length > 0 ? trues / filtered.length : 0, color: def.color,
        });
        continue;
      }
      const values: number[] = [];
      for (const e of filtered) { const v = e.metadata.trackers?.[def.id]; if (typeof v === "number" && !Number.isNaN(v)) values.push(v); }
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      const unit = def.id === "mood-score" ? "/10" : def.unit ? ` ${def.unit}` : "";
      const maxRef = def.id === "mood-score" ? 10 : def.id === "sleep" ? 12 : def.id === "water" ? 12 : Math.max(...values, 10);
      pins.push({
        id: `tracker:${def.id}`, label: def.name, icon: ICON_MAP[def.id] ?? <Activity size={13} />,
        value: avg !== null ? `${t["tracker.avg"] || "avg"} ${avg.toFixed(1)}${unit}` : "—",
        pct: avg !== null ? avg / maxRef : 0, color: def.color, adjust: def,
      });
    }
    return pins;
  }, [defs, filtered, entries, t, tConfig.accentHex]);

  const defaultPinned = useMemo(
    () => ["metric:streak", "metric:words", ...defs.filter((d) => d.type !== "string").map((d) => `tracker:${d.id}`)],
    [defs],
  );
  const pinnedSet = useMemo(() => new Set(pinned ?? defaultPinned), [pinned, defaultPinned]);
  const visiblePins = allPins.filter((p) => pinnedSet.has(p.id));

  const togglePin = async (id: string) => {
    const base = pinned ?? defaultPinned;
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    setPinned(next);
    try { await setPinnedMetrics(journal.rootPath, next); } catch { /* keep optimistic state */ }
  };

  // Increment/decrement a numeric tracker on today's entry (creating it if needed).
  const adjustToday = async (def: TrackerDefinition, delta: number) => {
    if (busyAdjust) return;
    setBusyAdjust(def.id);
    try {
      const todayKey = localDateKey(new Date());
      let entry = entries.find((e) => localDateKey(new Date(e.metadata.date)) === todayKey) ?? null;
      let isNew = false;
      if (!entry) { entry = await createEntry(journal.rootPath, "", new Date(), []); isNew = true; }
      const fresh = (await readEntry(entry.path)) ?? entry;
      const cur = typeof fresh.metadata.trackers?.[def.id] === "number" ? (fresh.metadata.trackers[def.id] as number) : 0;
      const nextVal = Math.max(0, Math.round((cur + delta) * 100) / 100);
      const updated = { ...fresh.metadata, trackers: { ...(fresh.metadata.trackers ?? {}), [def.id]: nextVal } };
      await saveEntry(fresh.path, updated, fresh.body, true);
      const wc = fresh.body.trim() ? fresh.body.trim().split(/\s+/).length : 0;
      const record: EntryRecord = { path: fresh.path, metadata: updated, body: fresh.body, wordCount: wc };
      dispatch({ type: isNew ? "ADD_ENTRY" : "UPDATE_ENTRY", entry: record });
    } catch { /* ignore */ } finally { setBusyAdjust(null); }
  };

  if (defs.length === 0 && allPins.length === 0) return null;

  const maxPct = Math.max(...visiblePins.map((p) => p.pct), 0.01);
  const focusLabel: Record<FocusPeriod, string> = {
    day: t["tracker.day"] || "Day",
    week: t["tracker.week"] || "Week",
    month: t["tracker.month"] || "Month",
    all: t["tracker.allTime"] || "All time",
  };

  return (
    <div className="mx-3 my-2">
      <div className="flex items-center gap-1 mb-2">
        {(["day", "week", "month", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFocus(f)}
            className="px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: focus === f ? tConfig.accentHex + "18" : "transparent",
              color: focus === f ? tConfig.accentHex : tConfig.fgHex + "55",
            }}>
            {focusLabel[f]}
          </button>
        ))}
        <button type="button" onClick={() => setShowPicker((v) => !v)}
          className="ml-auto h-6 w-6 rounded flex items-center justify-center transition-colors hover:opacity-70"
          style={{ color: showPicker ? tConfig.accentHex : tConfig.fgHex + "55" }}
          title={t["tracker.customize"] || "Choose highlights"} aria-expanded={showPicker}>
          <SlidersHorizontal size={13} />
        </button>
      </div>

      {showPicker && (
        <div className="mb-2 rounded-lg border p-1.5" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex }}>
          {allPins.map((p) => {
            const on = pinnedSet.has(p.id);
            return (
              <button key={p.id} type="button" onClick={() => togglePin(p.id)}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded text-[13px] transition-colors hover:opacity-80 text-left">
                <span className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: on ? tConfig.accentHex : "transparent", border: `1px solid ${on ? tConfig.accentHex : tConfig.uiBorderHex}` }}>
                  {on && <Check size={11} color="#fff" />}
                </span>
                <span className="shrink-0" style={{ color: p.color ?? tConfig.fgHex + "70" }}>{p.icon}</span>
                <span className="truncate" style={{ color: tConfig.fgHex + "CC" }}>{p.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        {visiblePins.length === 0 && (
          <p className="text-[11px] px-1.5" style={{ color: tConfig.fgHex + "45" }}>{t["tracker.noPins"] || "No highlights selected."}</p>
        )}
        {visiblePins.map((p) => (
          <div key={p.id} className="group">
            <div className="flex items-center gap-2 px-1.5">
              <span className="shrink-0" style={{ color: p.color ?? tConfig.accentHex }}>{p.icon}</span>
              <span className="text-[13px] truncate flex-1" style={{ color: tConfig.fgHex + "AA" }}>{p.label}</span>
              {p.adjust && (
                <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button type="button" disabled={busyAdjust !== null} onClick={() => adjustToday(p.adjust!, -1)}
                    className="h-4 w-4 rounded flex items-center justify-center hover:opacity-70 disabled:opacity-30"
                    style={{ color: tConfig.fgHex + "70" }} title={t["tracker.adjustToday"] || "Adjust today"}>
                    <Minus size={11} />
                  </button>
                  <button type="button" disabled={busyAdjust !== null} onClick={() => adjustToday(p.adjust!, 1)}
                    className="h-4 w-4 rounded flex items-center justify-center hover:opacity-70 disabled:opacity-30"
                    style={{ color: tConfig.fgHex + "70" }} title={t["tracker.adjustToday"] || "Adjust today"}>
                    <Plus size={11} />
                  </button>
                </span>
              )}
              <span className="text-[12px] font-medium shrink-0" style={{ color: tConfig.fgHex }}>{p.value}</span>
            </div>
            {p.pct > 0 && (
              <div className="mx-1.5 mt-0.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: tConfig.uiBorderHex }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((p.pct / maxPct) * 100, 100)}%`, backgroundColor: p.color ?? tConfig.accentHex }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
