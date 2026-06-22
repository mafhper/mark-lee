import { useState, useEffect, useMemo } from "react";
import { X, TrendingUp, BarChart3 } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { TrackerDefinition, JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { listEntries } from "../domain/entry-service";
import { getTrackerDefinitions } from "../domain/tracker-service";

interface TrackerStatsPanelProps {
  open: boolean;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  onClose: () => void;
}

interface TrackerStat {
  def: TrackerDefinition;
  values: number[];
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  total: number | null;
}

function BarChart({ values, color, height = 80 }: { values: number[]; color: string; height?: number }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const barW = Math.max(4, Math.min(16, (300 - values.length) / values.length));
  return (
    <svg width="100%" height={height} className="overflow-visible">
      {values.map((v, i) => (
        <rect key={i} x={i * (barW + 2)} y={height - (v / max) * height}
          width={barW} height={(v / max) * height} fill={color} rx={1} />
      ))}
    </svg>
  );
}

function computeStats(def: TrackerDefinition, entries: EntryRecord[]): TrackerStat {
  const values: number[] = [];
  for (const e of entries) {
    const v = e.metadata.trackers?.[def.id];
    if (typeof v === "number" && !Number.isNaN(v)) values.push(v);
    else if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n)) values.push(n);
    }
  }
  return {
    def,
    values,
    count: values.length,
    min: values.length > 0 ? Math.min(...values) : null,
    max: values.length > 0 ? Math.max(...values) : null,
    avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
    total: values.length > 0 ? values.reduce((a, b) => a + b, 0) : null,
  };
}

export function TrackerStatsPanel({ open, tConfig, journal, onClose }: TrackerStatsPanelProps) {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [defs, setDefs] = useState<TrackerDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !journal) return;
    setLoading(true);
    Promise.all([
      listEntries(journal.rootPath).then((r) => setEntries(r.entries)),
      getTrackerDefinitions(journal.rootPath).then(setDefs),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [open, journal?.rootPath]);

  const stats = useMemo(() => defs.map((d) => computeStats(d, entries)), [defs, entries]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-w-[90vw] max-h-[80vh] rounded-lg shadow-2xl border flex flex-col"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingUp size={15} /> Tracker Stats
          </h3>
          <button type="button" onClick={onClose} className="hover:opacity-60">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-xs" style={{ color: tConfig.fgHex + "60" }}>Loading...</p>
          ) : stats.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8" style={{ color: tConfig.fgHex + "50" }}>
              <BarChart3 size={28} />
              <p className="text-xs text-center">No tracker data yet.<br />Define trackers in the entry editor and log values to see stats.</p>
            </div>
          ) : (
            stats.map((s) => (
              <div key={s.def.id} className="p-3 rounded border" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "04" }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold" style={{ color: tConfig.fgHex }}>
                    {s.def.name}
                    {s.def.unit && <span className="opacity-50 ml-1 font-normal">({s.def.unit})</span>}
                  </h4>
                  <span className="text-[10px]" style={{ color: tConfig.fgHex + "50" }}>{s.count} entries</span>
                </div>
                <div className="flex gap-4 mb-2 text-[10px] flex-wrap" style={{ color: tConfig.fgHex + "60" }}>
                  {s.min !== null && (
                    <>
                      <span>Min: <strong style={{ color: tConfig.fgHex }}>{s.min}</strong></span>
                      <span>Max: <strong style={{ color: tConfig.fgHex }}>{s.max}</strong></span>
                      <span>Avg: <strong style={{ color: tConfig.fgHex }}>{s.avg?.toFixed(1)}</strong></span>
                      {s.def.type === "number" && <span>Total: <strong style={{ color: tConfig.fgHex }}>{s.total}</strong></span>}
                    </>
                  )}
                </div>
                {s.values.length > 0 && s.def.type === "number" && (
                  <div className="overflow-x-auto">
                    <BarChart values={s.values} color={s.def.color ?? tConfig.accentHex} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t shrink-0" style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded border"
            style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>Close</button>
        </div>
      </div>
    </div>
  );
}
