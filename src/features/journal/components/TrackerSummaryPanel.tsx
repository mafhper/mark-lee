import { useState, useEffect, useMemo } from "react";
import { Activity, Droplets, Dumbbell, Moon, StickyNote, TrendingUp, Inbox } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { TrackerDefinition, JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { listEntries } from "../domain/entry-service";
import { getTrackerDefinitions } from "../domain/tracker-service";

interface TrackerSummaryPanelProps {
  tConfig: ThemeConfig;
  journal: JournalDescriptor;
}

type FocusPeriod = "day" | "week" | "month" | "all";

function getDateRange(focus: FocusPeriod): Date[] {
  const now = new Date();
  switch (focus) {
    case "day": {
      const d = new Date(now); d.setHours(0,0,0,0);
      const e = new Date(now); e.setHours(23,59,59,999);
      return [d, e];
    }
    case "week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.getFullYear(), now.getMonth(), diff);
      mon.setHours(0,0,0,0);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
      return [mon, sun];
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return [s, e];
    }
    case "all": return [new Date(0), new Date(8640000000000000)];
  }
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "mood-score": <TrendingUp size={12} />,
  "water": <Droplets size={12} />,
  "sleep": <Moon size={12} />,
  "exercise": <Dumbbell size={12} />,
  "notes": <StickyNote size={12} />,
};

export function TrackerSummaryPanel({ tConfig, journal }: TrackerSummaryPanelProps) {
  const [focus, setFocus] = useState<FocusPeriod>("month");
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [defs, setDefs] = useState<TrackerDefinition[]>([]);

  useEffect(() => {
    Promise.all([
      listEntries(journal.rootPath).then((r) => setEntries(r.entries)),
      getTrackerDefinitions(journal.rootPath).then(setDefs),
    ]).catch(() => {});
  }, [journal.rootPath]);

  const filtered = useMemo(() => {
    const [start, end] = getDateRange(focus);
    return entries.filter((e) => { const d = new Date(e.metadata.date); return d >= start && d <= end; });
  }, [entries, focus]);

  const stats = useMemo(() => defs.map((def) => {
    if (def.type === "boolean") {
      let trues = 0;
      for (const e of filtered) { if (e.metadata.trackers?.[def.id] === true) trues++; }
      return { def, value: filtered.length > 0 ? `${trues}/${filtered.length}` : "—", pct: filtered.length > 0 ? trues / filtered.length : 0 };
    }
    if (def.type === "string") {
      let last: string | null = null;
      for (const e of filtered) { const v = e.metadata.trackers?.[def.id]; if (typeof v === "string" && v) last = v; }
      return { def, value: last ?? "—", pct: 0 };
    }
    const values: number[] = [];
    for (const e of filtered) { const v = e.metadata.trackers?.[def.id]; if (typeof v === "number" && !Number.isNaN(v)) values.push(v); }
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const unit = def.unit || "";
    const label = def.id === "mood-score" ? `/10` : unit ? ` ${unit}` : "";
    const detail = values.length > 0 ? `avg ${avg!.toFixed(1)}${label}` : "—";
    const maxRef = def.id === "mood-score" ? 10 : def.id === "sleep" ? 12 : def.id === "water" ? 12 : Math.max(...values, 10);
    return { def, value: detail, pct: avg !== null ? avg / maxRef : 0 };
  }).filter((s) => s.value !== "—"), [defs, filtered]);

  const maxPct = Math.max(...stats.map((s) => s.pct), 0.01);

  if (defs.length === 0) return null;

  const focusLabel = { day: "Day", week: "Week", month: "Month", all: "All time" } as const;

  return (
    <div className="mx-3 my-2">
      <div className="flex items-center gap-1 mb-2">
            {(["day", "week", "month", "all"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFocus(f)}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: focus === f ? tConfig.accentHex + "18" : "transparent",
                  color: focus === f ? tConfig.accentHex : tConfig.fgHex + "40",
                }}>
                {focusLabel[f]}
              </button>
            ))}
          </div>

          <div className="text-[9px] mb-2 flex items-center gap-1" style={{ color: tConfig.fgHex + "40" }}>
            <Inbox size={9} />
            {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} in this period
          </div>

          <div className="space-y-1.5">
            {stats.map((s) => {
              const icon = ICON_MAP[s.def.id] ?? <Activity size={12} />;
              return (
                <div key={s.def.id}>
                  <div className="flex items-center gap-2 px-1.5">
                    <span className="shrink-0" style={{ color: s.def.color ?? tConfig.accentHex }}>{icon}</span>
                    <span className="text-[10px] truncate flex-1" style={{ color: tConfig.fgHex + "70" }}>{s.def.name}</span>
                    <span className="text-[10px] font-medium shrink-0" style={{ color: tConfig.fgHex }}>{s.value}</span>
                  </div>
                  {s.pct > 0 && (
                    <div className="mx-1.5 mt-0.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: tConfig.uiBorderHex }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min((s.pct / maxPct) * 100, 100)}%`,
                        backgroundColor: s.def.color ?? tConfig.accentHex,
                      }} />
                    </div>
                  )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
