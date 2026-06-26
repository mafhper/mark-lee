import type { PinAggregation, PinConfig, PinMetricId, PinsConfig, TrackerDefinition } from "./journal.types";

export function createDefaultPinConfigs(defs: TrackerDefinition[]): PinsConfig {
  const items: PinConfig[] = [
    {
      id: "pin:metric:streak",
      source: "metric",
      metricId: "streak",
      label: "Streak",
      period: "all",
      aggregation: "count",
      format: "value",
      order: 0,
      visible: true,
      color: "#f97316",
    },
    {
      id: "pin:metric:words",
      source: "metric",
      metricId: "words",
      label: "Words",
      period: "month",
      aggregation: "sum",
      format: "value",
      order: 1,
      visible: true,
      color: "#3b82f6",
    },
    {
      id: "pin:metric:entries",
      source: "metric",
      metricId: "entries",
      label: "Entries",
      period: "month",
      aggregation: "count",
      format: "bar",
      order: 2,
      visible: true,
    },
  ];

  for (const def of defs.filter((item) => item.type !== "string")) {
    items.push({
      id: `pin:tracker:${def.id}`,
      source: "tracker",
      trackerId: def.id,
      label: def.name,
      period: "month",
      aggregation: def.type === "boolean" ? "count" : def.aggregation ?? "avg",
      target: def.target,
      color: def.color,
      format: def.display ?? (def.target ? "bar" : "value"),
      order: items.length,
      visible: true,
    });
  }

  return { version: 1, items };
}

export function normalizePinOrder(items: PinConfig[]): PinConfig[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, order) => ({ ...item, order }));
}

export function createMetricPin(metricId: PinMetricId, order: number): PinConfig {
  const label: Record<PinMetricId, string> = {
    streak: "Streak",
    words: "Words",
    entries: "Entries",
  };
  return {
    id: `pin:${crypto.randomUUID()}`,
    source: "metric",
    metricId,
    label: label[metricId],
    period: metricId === "streak" ? "all" : "month",
    aggregation: metricId === "entries" || metricId === "streak" ? "count" : "sum",
    format: metricId === "entries" ? "bar" : "value",
    order,
    visible: true,
  };
}

export function createTrackerPin(def: TrackerDefinition, order: number): PinConfig {
  return {
    id: `pin:${crypto.randomUUID()}`,
    source: "tracker",
    trackerId: def.id,
    label: def.name,
    period: "month",
    aggregation: defaultAggregationForTracker(def),
    target: def.target,
    color: def.color,
    format: def.target ? "bar" : "value",
    order,
    visible: true,
  };
}

export function defaultAggregationForTracker(def: TrackerDefinition): PinAggregation {
  if (def.type === "boolean") return "count";
  if (def.type === "number") return def.aggregation ?? "avg";
  return "latest";
}
