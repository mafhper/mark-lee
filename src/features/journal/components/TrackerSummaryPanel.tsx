import { useEffect, useMemo, useState } from "react";
import { Activity, Droplets, Dumbbell, Flame, Inbox, Minus, Moon, PencilLine, Plus, Settings2, TrendingUp } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor, PinAggregation, PinConfig, PinsConfig, TrackerDefinition } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { createEntry, readEntry, saveEntry } from "../domain/entry-service";
import { readManifest } from "../domain/manifest-service";
import { createDefaultPinConfigs, normalizePinOrder } from "../domain/pins";
import { adjustActiveEntryTracker } from "../../editor/active-target";
import { useJournalSession } from "../session/JournalSessionContext";
import { PinSettingsDialog } from "./PinSettingsDialog";

interface TrackerSummaryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateRange(period: PinConfig["period"]): [Date, Date] {
  const now = new Date();
  switch (period) {
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

function filterByPeriod(entries: EntryRecord[], period: PinConfig["period"]) {
  const [start, end] = getDateRange(period);
  return entries.filter((entry) => {
    const date = new Date(entry.metadata.date);
    return date >= start && date <= end;
  });
}

function computeStreak(entries: EntryRecord[]): number {
  const days = new Set(entries.map((entry) => localDateKey(new Date(entry.metadata.date))));
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function aggregate(values: number[], mode: PinAggregation): number | null {
  if (values.length === 0) return null;
  if (mode === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (mode === "min") return Math.min(...values);
  if (mode === "max") return Math.max(...values);
  if (mode === "latest") return values[values.length - 1] ?? null;
  if (mode === "count") return values.length;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function seriesFor(entries: EntryRecord[], def: TrackerDefinition, aggregation: PinAggregation): number[] {
  const byDay = new Map<string, number[]>();
  for (const entry of entries) {
    const raw = entry.metadata.trackers?.[def.id];
    const value = def.type === "boolean" ? (raw === true ? 1 : 0) : typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    if (value === null) continue;
    const key = localDateKey(new Date(entry.metadata.date));
    const bucket = byDay.get(key) ?? [];
    bucket.push(value);
    byDay.set(key, bucket);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([, values]) => aggregate(values, aggregation) ?? 0);
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "mood-score": <TrendingUp size={13} />,
  water: <Droplets size={13} />,
  sleep: <Moon size={13} />,
  exercise: <Dumbbell size={13} />,
};

interface ComputedPin {
  config: PinConfig;
  label: string;
  value: string;
  pct: number | null;
  color: string;
  icon: React.ReactNode;
  series?: number[];
  adjust?: TrackerDefinition;
}

function periodLabel(period: PinConfig["period"], t: Record<string, string>) {
  if (period === "all") return t["tracker.allTime"] || "All";
  return t[`tracker.${period}`] || period;
}

function metricLabel(config: PinConfig, t: Record<string, string>) {
  if (config.metricId === "streak") return t["tracker.streak"] || config.label || "Streak";
  if (config.metricId === "words") return t["tracker.words"] || config.label || "Words";
  if (config.metricId === "entries") return t["journal.entries"] || config.label || "Entries";
  return config.label || "Metric";
}

function metricDisplayLabel(config: PinConfig, t: Record<string, string>) {
  const label = (config.label || "").trim();
  const normalized = label.toLowerCase();
  const isDefault =
    !label ||
    normalized === config.metricId ||
    normalized === "streak" ||
    normalized === "words" ||
    normalized === "entries";
  return isDefault ? metricLabel(config, t) : label;
}

function trackerDisplayLabel(config: PinConfig, def: TrackerDefinition) {
  const label = (config.label || "").trim();
  return !label || label.toLowerCase() === def.id.toLowerCase() ? def.name : label;
}

function computePin(config: PinConfig, entries: EntryRecord[], defs: TrackerDefinition[], t: Record<string, string>, accent: string): ComputedPin | null {
  const scoped = filterByPeriod(entries, config.period);
  const color = config.color || accent;

  if (config.source === "metric") {
    if (config.metricId === "streak") {
      const streak = computeStreak(entries);
      const unit = streak === 1 ? (t["tracker.dayUnit"] || "day") : (t["tracker.days"] || "days");
      return {
        config,
        label: metricDisplayLabel(config, t),
        value: `${streak} ${unit}`,
        pct: config.target ? streak / config.target : null,
        color: config.color || "#f97316",
        icon: <Flame size={13} />,
      };
    }
    if (config.metricId === "words") {
      const words = scoped.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
      return {
        config,
        label: metricDisplayLabel(config, t),
        value: `${words}`,
        pct: config.target ? words / config.target : null,
        color: config.color || "#3b82f6",
        icon: <PencilLine size={13} />,
      };
    }
    if (config.metricId === "entries") {
      const count = scoped.length;
      return {
        config,
        label: metricDisplayLabel(config, t),
        value: `${count}`,
        pct: config.target ? count / config.target : null,
        color,
        icon: <Inbox size={13} />,
      };
    }
    return null;
  }

  const def = defs.find((item) => item.id === config.trackerId);
  if (!def) return null;
  if (def.type === "string") {
    const latest = [...scoped].reverse().find((entry) => typeof entry.metadata.trackers?.[def.id] === "string");
    const value = latest?.metadata.trackers?.[def.id];
    return {
      config,
      label: trackerDisplayLabel(config, def),
      value: typeof value === "string" && value ? value : "—",
      pct: null,
      color: config.color || def.color || accent,
      icon: ICON_MAP[def.id] ?? <Activity size={13} />,
    };
  }

  if (def.type === "boolean") {
    const total = scoped.length;
    const trues = scoped.filter((entry) => entry.metadata.trackers?.[def.id] === true).length;
    const target = config.target || total;
    return {
      config,
      label: trackerDisplayLabel(config, def),
      value: total > 0 ? `${trues}/${total}` : "—",
      pct: target > 0 ? trues / target : null,
      color: config.color || def.color || accent,
      icon: ICON_MAP[def.id] ?? <Activity size={13} />,
      series: config.format === "sparkline" ? seriesFor(scoped, def, "sum") : undefined,
    };
  }

  const values = scoped
    .map((entry) => entry.metadata.trackers?.[def.id])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const value = aggregate(values, config.aggregation);
  const unit = def.unit ? ` ${def.unit}` : "";
  const prefix = config.aggregation === "avg" ? `${t["tracker.avg"] || "avg"} ` : "";
  return {
    config,
    label: trackerDisplayLabel(config, def),
    value: value !== null ? `${prefix}${Number.isInteger(value) ? value : value.toFixed(1)}${unit}` : "—",
    pct: config.target && value !== null ? value / config.target : null,
    color: config.color || def.color || accent,
    icon: ICON_MAP[def.id] ?? <Activity size={13} />,
    series: config.format === "sparkline" ? seriesFor(scoped, def, config.aggregation) : undefined,
    adjust: def,
  };
}

export function TrackerSummaryPanel({ t, tConfig, journal }: TrackerSummaryPanelProps) {
  const { state: session, dispatch } = useJournalSession();
  const [defs, setDefs] = useState<TrackerDefinition[]>([]);
  const [pinsConfig, setPinsConfig] = useState<PinsConfig>({ version: 1, items: [] });
  const [periodOverride, setPeriodOverride] = useState<PinConfig["period"]>("month");
  const [showSettings, setShowSettings] = useState(false);
  const [busyAdjust, setBusyAdjust] = useState<string | null>(null);

  const entries = session.entries;

  useEffect(() => {
    let active = true;
    readManifest(journal.rootPath)
      .then((manifest) => {
        if (!active) return;
        const nextDefs = manifest?.trackerDefinitions ?? [];
        setDefs(nextDefs);
        setPinsConfig(manifest?.pinsConfig ?? createDefaultPinConfigs(nextDefs));
      })
      .catch(() => {
        if (!active) return;
        setDefs([]);
        setPinsConfig(createDefaultPinConfigs([]));
      });
    return () => { active = false; };
  }, [journal.rootPath, session.revision]);

  const visiblePins = useMemo(
    () => normalizePinOrder(pinsConfig.items).filter((pin) => pin.visible),
    [pinsConfig],
  );

  const computedPins = useMemo(
    () => visiblePins
      .map((pin) => computePin({ ...pin, period: periodOverride }, entries, defs, t, tConfig.accentHex))
      .filter((pin): pin is ComputedPin => pin !== null),
    [defs, entries, periodOverride, t, tConfig.accentHex, visiblePins],
  );

  const adjustToday = async (def: TrackerDefinition, delta: number) => {
    if (busyAdjust) return;
    setBusyAdjust(def.id);
    try {
      const todayKey = localDateKey(new Date());
      let entry = entries.find((item) => localDateKey(new Date(item.metadata.date)) === todayKey) ?? null;
      if (entry && adjustActiveEntryTracker(entry.metadata.id, def.id, delta)) return;
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
    } catch {
      /* keep the visible value unchanged on failed quick-adjust */
    } finally {
      setBusyAdjust(null);
    }
  };

  const renderSparkline = (pin: ComputedPin) => {
    if (!pin.series || pin.series.length === 0) return null;
    const max = Math.max(...pin.series, 1);
    return (
      <div className="mx-1.5 mt-1 flex h-5 items-end gap-px" aria-hidden="true">
        {pin.series.map((value, index) => (
          <span key={`${pin.config.id}-${index}`} className="w-1 rounded-t"
            style={{ height: `${Math.max(2, (value / max) * 20)}px`, backgroundColor: pin.color, opacity: 0.35 + (index / pin.series!.length) * 0.5 }} />
        ))}
      </div>
    );
  };

  const periodOptions: PinConfig["period"][] = ["day", "week", "month", "all"];

  return (
    <div className="mx-3 my-2">
      <div className="mb-2 flex items-center justify-end">
        <button type="button" onClick={() => setShowSettings(true)}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:opacity-70"
          style={{ color: tConfig.fgHex + "55" }}
          title={t["tracker.customize"] || "Choose highlights"}>
          <Settings2 size={13} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-4 rounded-md p-0.5"
        style={{ backgroundColor: tConfig.fgHex + "0A", border: `1px solid ${tConfig.uiBorderHex}` }}>
        {periodOptions.map((period) => {
          const active = periodOverride === period;
          return (
            <button key={period} type="button" onClick={() => setPeriodOverride(period)}
              className="rounded px-1 py-1 text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: active ? tConfig.accentHex + "22" : "transparent",
                color: active ? tConfig.accentHex : tConfig.fgHex + "70",
              }}>
              {periodLabel(period, t)}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        {computedPins.length === 0 && (
          <p className="px-1.5 text-[11px]" style={{ color: tConfig.fgHex + "45" }}>
            {t["tracker.noPins"] || "No highlights selected."}
          </p>
        )}
        {computedPins.map((pin) => (
          <div key={pin.config.id} className="group rounded-md py-0.5">
            <div className="flex items-center gap-2 px-1.5">
              <span className="shrink-0" style={{ color: pin.color }}>{pin.icon}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: tConfig.fgHex + "AA" }}>{pin.label}</span>
              {pin.adjust && (
                <span className="hidden items-center gap-0.5 group-hover:flex">
                  <button type="button" disabled={busyAdjust !== null} onClick={() => adjustToday(pin.adjust!, -1)}
                    className="flex h-4 w-4 items-center justify-center rounded hover:opacity-70 disabled:opacity-30"
                    style={{ color: tConfig.fgHex + "70" }} title={t["tracker.adjustToday"] || "Adjust today"}>
                    <Minus size={11} />
                  </button>
                  <button type="button" disabled={busyAdjust !== null} onClick={() => adjustToday(pin.adjust!, 1)}
                    className="flex h-4 w-4 items-center justify-center rounded hover:opacity-70 disabled:opacity-30"
                    style={{ color: tConfig.fgHex + "70" }} title={t["tracker.adjustToday"] || "Adjust today"}>
                    <Plus size={11} />
                  </button>
                </span>
              )}
              <span className="shrink-0 text-[12px] font-medium" style={{ color: tConfig.fgHex }}>{pin.value}</span>
            </div>
            {pin.config.format === "sparkline" ? renderSparkline(pin) : pin.config.format === "bar" && pin.pct !== null ? (
              <div className="mx-1.5 mt-1 h-0.5 overflow-hidden rounded-full" style={{ backgroundColor: tConfig.uiBorderHex }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(pin.pct, 0), 1) * 100}%`, backgroundColor: pin.color }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <PinSettingsDialog
        open={showSettings}
        t={t}
        tConfig={tConfig}
        journalRootPath={journal.rootPath}
        definitions={defs}
        pinsConfig={pinsConfig}
        onClose={() => setShowSettings(false)}
        onSaved={(nextDefs, nextConfig) => {
          setDefs(nextDefs);
          setPinsConfig(nextConfig);
        }}
      />
    </div>
  );
}
