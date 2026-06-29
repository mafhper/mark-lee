import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, X } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { PinAggregation, PinConfig, PinDisplayFormat, PinMetricId, PinPeriod, PinsConfig, TrackerDefinition } from "../domain/journal.types";
import { createMetricPin, createTrackerPin, defaultAggregationForTracker, normalizePinOrder } from "../domain/pins";
import { setJournalInsights } from "../domain/manifest-service";

interface PinSettingsDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journalRootPath: string;
  definitions: TrackerDefinition[];
  pinsConfig: PinsConfig;
  onClose: () => void;
  onSaved: (definitions: TrackerDefinition[], config: PinsConfig) => void;
}

const PERIODS: PinPeriod[] = ["day", "week", "month", "all"];
const AGGREGATIONS: PinAggregation[] = ["sum", "avg", "min", "max", "latest", "count"];
const FORMATS: PinDisplayFormat[] = ["value", "bar", "sparkline"];
const METRICS: PinMetricId[] = ["streak", "words", "entries"];
const TRACKER_TYPES: TrackerDefinition["type"][] = ["number", "boolean", "string"];

function emptyTracker(): TrackerDefinition {
  return { id: crypto.randomUUID(), name: "", type: "number", unit: "", color: "#3b82f6" };
}

function metricLabel(metric: PinMetricId, t: Record<string, string>) {
  if (metric === "streak") return t["tracker.streak"] || "Sequencia";
  if (metric === "words") return t["tracker.words"] || "Palavras";
  return t["journal.entries"] || "Registros";
}

function periodLabel(period: PinPeriod, t: Record<string, string>) {
  return period === "all" ? (t["tracker.allTime"] || "Todos") : (t[`tracker.${period}`] || period);
}

function defaultPinLabel(pin: PinConfig, defs: TrackerDefinition[], t: Record<string, string>) {
  const label = (pin.label || "").trim();
  const normalized = label.toLowerCase();
  if (pin.source === "metric" && pin.metricId) {
    const isDefault = !label || normalized === pin.metricId || normalized === "streak" || normalized === "words" || normalized === "entries";
    return isDefault ? metricLabel(pin.metricId, t) : label;
  }
  const def = defs.find((item) => item.id === pin.trackerId);
  if (def && (!label || normalized === def.id.toLowerCase())) return def.name;
  return label || "Pin";
}

function aggregationLabel(value: PinAggregation, t: Record<string, string>) {
  return t[`tracker.aggregation.${value}`] || value;
}

function formatLabel(value: PinDisplayFormat, t: Record<string, string>) {
  return t[`tracker.format.${value}`] || value;
}

function typeLabel(value: TrackerDefinition["type"], t: Record<string, string>) {
  return t[`tracker.type.${value}`] || value;
}

export function PinSettingsDialog({
  open, t, tConfig, journalRootPath, definitions, pinsConfig, onClose, onSaved,
}: PinSettingsDialogProps) {
  const [defs, setDefs] = useState<TrackerDefinition[]>([]);
  const [pins, setPins] = useState<PinConfig[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDefs(definitions);
    setPins(normalizePinOrder(pinsConfig.items).map((pin) => ({ ...pin, label: defaultPinLabel(pin, definitions, t) })));
    setSaving(false);
  }, [definitions, open, pinsConfig, t]);

  const numericOrBooleanDefs = useMemo(() => defs.filter((def) => def.type !== "string"), [defs]);
  const inputClass = "w-full rounded-md border bg-transparent px-2.5 py-1.5 text-xs outline-none";
  const panelStyle = { borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex + "B8" };
  const cardStyle = { borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex + "D8" };
  const fieldStyle = { borderColor: tConfig.uiBorderHex, color: tConfig.fgHex };

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="block min-w-0 text-[11px] font-medium" style={{ color: tConfig.fgHex + "74" }}>
      <span className="mb-1 block truncate">{label}</span>
      {children}
    </label>
  );

  const updatePin = (id: string, patch: Partial<PinConfig>) => {
    setPins((prev) => prev.map((pin) => (pin.id === id ? { ...pin, ...patch } : pin)));
  };

  const movePin = (id: string, delta: number) => {
    setPins((prev) => {
      const ordered = normalizePinOrder(prev);
      const index = ordered.findIndex((pin) => pin.id === id);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return ordered;
      const next = [...ordered];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return normalizePinOrder(next);
    });
  };

  const addMetricPin = () => {
    const used = new Set(pins.filter((pin) => pin.source === "metric").map((pin) => pin.metricId));
    const metric = METRICS.find((item) => !used.has(item)) ?? "entries";
    const pin = createMetricPin(metric, pins.length);
    setPins((prev) => normalizePinOrder([...prev, { ...pin, label: metricLabel(metric, t) }]));
  };

  const addTrackerPin = () => {
    const def = numericOrBooleanDefs[0];
    if (!def) return;
    setPins((prev) => normalizePinOrder([...prev, createTrackerPin(def, prev.length)]));
  };

  const updateDef = (id: string, patch: Partial<TrackerDefinition>) => {
    const currentName = defs.find((def) => def.id === id)?.name;
    setDefs((prev) => prev.map((def) => (def.id === id ? { ...def, ...patch } : def)));
    if (patch.name || patch.color || patch.target || patch.aggregation || patch.display) {
      setPins((prev) => prev.map((pin) => {
        if (pin.trackerId !== id) return pin;
        return {
          ...pin,
          label: patch.name && pin.label === currentName ? patch.name : pin.label,
          color: patch.color ?? pin.color,
          target: patch.target ?? pin.target,
          aggregation: patch.aggregation ?? pin.aggregation,
          format: patch.display ?? pin.format,
        };
      }));
    }
  };

  const addTracker = () => setDefs((prev) => [...prev, emptyTracker()]);

  const removeTracker = (id: string) => {
    setDefs((prev) => prev.filter((def) => def.id !== id));
    setPins((prev) => normalizePinOrder(prev.filter((pin) => pin.trackerId !== id)));
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanedDefs = defs.filter((def) => def.name.trim()).map((def) => ({
      ...def,
      unit: def.unit?.trim() || undefined,
      color: def.color?.trim() || undefined,
      target: typeof def.target === "number" && Number.isFinite(def.target) && def.target > 0 ? def.target : undefined,
    }));
    const cleanedPins = normalizePinOrder(pins.filter((pin) => {
      if (pin.source === "metric") return Boolean(pin.metricId);
      return Boolean(pin.trackerId && cleanedDefs.some((def) => def.id === pin.trackerId));
    }).map((pin) => ({
      ...pin,
      label: pin.label.trim() || defaultPinLabel(pin, cleanedDefs, t),
      color: pin.color?.trim() || undefined,
      target: typeof pin.target === "number" && Number.isFinite(pin.target) && pin.target > 0 ? pin.target : undefined,
    })));
    const config = { version: 1 as const, items: cleanedPins };
    try {
      await setJournalInsights(journalRootPath, cleanedDefs, config);
      onSaved(cleanedDefs, config);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-[900px] max-w-[94vw] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "0C" }}>
          <div>
            <h3 className="text-base font-semibold">{t["journal.pins"] || "Pins"}</h3>
            <p className="mt-0.5 text-xs" style={{ color: tConfig.fgHex + "72" }}>
              {t["tracker.customize"] || "Escolher destaques"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:opacity-70" aria-label={t["journal.close"] || "Fechar"}>
            <X size={16} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(290px,.85fr)]">
          <section className="min-w-0 rounded-lg border p-3" style={panelStyle}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: tConfig.fgHex + "74" }}>
                  {t["tracker.configuredPins"] || "Pins configurados"}
                </h4>
                <p className="mt-0.5 text-[11px]" style={{ color: tConfig.fgHex + "58" }}>
                  {t["tracker.configuredPinsDesc"] || "Escolha o que aparece na barra lateral."}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={addMetricPin} className="rounded-md px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                  <Plus size={12} className="mr-1 inline" />{t["tracker.metric"] || "Metrica"}
                </button>
                <button type="button" onClick={addTrackerPin} disabled={numericOrBooleanDefs.length === 0}
                  className="rounded-md px-2 py-1 text-xs font-medium disabled:opacity-40"
                  style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                  <Plus size={12} className="mr-1 inline" />{t["tracker.customTracker"] || "Medidor"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {pins.length === 0 ? (
                <p className="rounded-lg border p-3 text-xs" style={{ ...cardStyle, color: tConfig.fgHex + "60" }}>
                  {t["tracker.noPins"] || "Nenhum destaque selecionado."}
                </p>
              ) : pins.map((pin, index) => (
                <div key={pin.id} className="rounded-lg border p-3" style={cardStyle}>
                  <div className="mb-3 flex items-center gap-2">
                    <button type="button" onClick={() => updatePin(pin.id, { visible: !pin.visible })}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                      style={{ borderColor: tConfig.uiBorderHex, color: pin.visible ? tConfig.accentHex : tConfig.fgHex + "45" }}>
                      {pin.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <input className={`${inputClass} font-medium`} value={pin.label} onChange={(event) => updatePin(pin.id, { label: event.target.value })}
                      style={fieldStyle} aria-label={t["tracker.name"] || "Nome"} />
                    <div className="flex shrink-0 gap-0.5">
                      <button type="button" onClick={() => movePin(pin.id, -1)} disabled={index === 0} className="rounded p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button type="button" onClick={() => movePin(pin.id, 1)} disabled={index === pins.length - 1} className="rounded p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                      <button type="button" onClick={() => setPins((prev) => normalizePinOrder(prev.filter((item) => item.id !== pin.id)))}
                        className="rounded p-1 text-rose-400"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <Field label={t["tracker.source"] || "Origem"}>
                      <select className={inputClass} value={pin.source} onChange={(event) => {
                        const source = event.target.value as PinConfig["source"];
                        updatePin(pin.id, source === "metric"
                          ? { source, metricId: "entries", trackerId: undefined, label: metricLabel("entries", t), aggregation: "count" }
                          : { source, trackerId: numericOrBooleanDefs[0]?.id, metricId: undefined, label: numericOrBooleanDefs[0]?.name || pin.label, aggregation: numericOrBooleanDefs[0] ? defaultAggregationForTracker(numericOrBooleanDefs[0]) : "avg" });
                      }} style={fieldStyle}>
                        <option value="metric">{t["tracker.metric"] || "Metrica"}</option>
                        <option value="tracker">{t["tracker.customTracker"] || "Medidor"}</option>
                      </select>
                    </Field>
                    <Field label={pin.source === "metric" ? (t["tracker.metric"] || "Metrica") : (t["tracker.customTracker"] || "Medidor")}>
                      {pin.source === "metric" ? (
                        <select className={inputClass} value={pin.metricId} onChange={(event) => {
                          const metric = event.target.value as PinMetricId;
                          updatePin(pin.id, { metricId: metric, label: metricLabel(metric, t) });
                        }} style={fieldStyle}>
                          {METRICS.map((metric) => <option key={metric} value={metric}>{metricLabel(metric, t)}</option>)}
                        </select>
                      ) : (
                        <select className={inputClass} value={pin.trackerId} onChange={(event) => {
                          const def = defs.find((item) => item.id === event.target.value);
                          updatePin(pin.id, {
                            trackerId: event.target.value,
                            label: def?.name || pin.label,
                            aggregation: def ? defaultAggregationForTracker(def) : pin.aggregation,
                          });
                        }} style={fieldStyle}>
                          {numericOrBooleanDefs.map((def) => <option key={def.id} value={def.id}>{def.name || def.id}</option>)}
                        </select>
                      )}
                    </Field>
                    <Field label={t["tracker.period"] || "Periodo"}>
                      <select className={inputClass} value={pin.period} onChange={(event) => updatePin(pin.id, { period: event.target.value as PinPeriod })}
                        style={fieldStyle}>
                        {PERIODS.map((period) => <option key={period} value={period}>{periodLabel(period, t)}</option>)}
                      </select>
                    </Field>
                    <Field label={t["tracker.aggregation"] || "Agregacao"}>
                      <select className={inputClass} value={pin.aggregation} onChange={(event) => updatePin(pin.id, { aggregation: event.target.value as PinAggregation })}
                        style={fieldStyle}>
                        {AGGREGATIONS.map((aggregation) => <option key={aggregation} value={aggregation}>{aggregationLabel(aggregation, t)}</option>)}
                      </select>
                    </Field>
                    <Field label={t["tracker.format"] || "Formato"}>
                      <select className={inputClass} value={pin.format} onChange={(event) => updatePin(pin.id, { format: event.target.value as PinDisplayFormat })}
                        style={fieldStyle}>
                        {FORMATS.map((format) => <option key={format} value={format}>{formatLabel(format, t)}</option>)}
                      </select>
                    </Field>
                    <Field label={t["tracker.target"] || "Meta"}>
                      <input className={inputClass} type="number" min="0" value={pin.target ?? ""}
                        onChange={(event) => updatePin(pin.id, { target: event.target.value ? Number(event.target.value) : undefined })}
                        style={fieldStyle} />
                    </Field>
                    <Field label={t["journal.color"] || "Cor"}>
                      <input className={`${inputClass} h-8 p-1`} type="color" value={pin.color || tConfig.accentHex} onChange={(event) => updatePin(pin.id, { color: event.target.value })}
                        style={fieldStyle} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border p-3" style={panelStyle}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: tConfig.fgHex + "74" }}>
                  {t["tracker.customTrackers"] || "Medidores"}
                </h4>
                <p className="mt-0.5 text-[11px]" style={{ color: tConfig.fgHex + "58" }}>
                  {t["tracker.customTrackersDesc"] || "Defina qualquer coisa que queira medir."}
                </p>
              </div>
              <button type="button" onClick={addTracker} className="rounded-md px-2 py-1 text-xs font-medium"
                style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                <Plus size={12} className="mr-1 inline" />{t["journal.add"] || "Adicionar"}
              </button>
            </div>
            <div className="space-y-2">
              {defs.length === 0 ? (
                <p className="rounded-lg border p-3 text-xs" style={{ ...cardStyle, color: tConfig.fgHex + "60" }}>
                  {t["tracker.noTrackers"] || "Crie qualquer coisa que queira medir."}
                </p>
              ) : defs.map((def) => (
                <div key={def.id} className="rounded-lg border p-3" style={cardStyle}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: (def.color || tConfig.accentHex) + "18", color: def.color || tConfig.accentHex }}>
                      <Activity size={14} />
                    </span>
                    <input className={`${inputClass} font-medium`} value={def.name} placeholder={t["tracker.name"] || "Nome"}
                      onChange={(event) => updateDef(def.id, { name: event.target.value })}
                      style={fieldStyle} />
                    <button type="button" onClick={() => removeTracker(def.id)} className="rounded p-1 text-rose-400"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Field label={t["tracker.type"] || "Tipo"}>
                      <select className={inputClass} value={def.type} onChange={(event) => updateDef(def.id, { type: event.target.value as TrackerDefinition["type"] })}
                        style={fieldStyle}>
                        {TRACKER_TYPES.map((type) => <option key={type} value={type}>{typeLabel(type, t)}</option>)}
                      </select>
                    </Field>
                    <Field label={t["tracker.unit"] || "Unidade"}>
                      <input className={inputClass} value={def.unit ?? ""}
                        onChange={(event) => updateDef(def.id, { unit: event.target.value })}
                        style={fieldStyle} />
                    </Field>
                    <Field label={t["tracker.target"] || "Meta"}>
                      <input className={inputClass} type="number" min="0" value={def.target ?? ""}
                        onChange={(event) => updateDef(def.id, { target: event.target.value ? Number(event.target.value) : undefined })}
                        style={fieldStyle} />
                    </Field>
                    <Field label={t["journal.color"] || "Cor"}>
                      <input className={`${inputClass} h-8 p-1`} type="color" value={def.color || tConfig.accentHex}
                        onChange={(event) => updateDef(def.id, { color: event.target.value })}
                        style={fieldStyle} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "85" }}>
            {t["journal.cancel"] || "Cancelar"}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            <Save size={12} />{saving ? (t["journal.saving"] || "salvando") : (t["journal.save"] || "Salvar")}
          </button>
        </div>
      </div>
    </div>
  );
}
