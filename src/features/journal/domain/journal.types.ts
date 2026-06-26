export interface TrackerDefinition {
  id: string;
  name: string;
  type: "number" | "string" | "boolean";
  unit?: string;
  icon?: string;
  color?: string;
  target?: number;
  aggregation?: PinAggregation;
  display?: PinDisplayFormat;
}

export type PinPeriod = "day" | "week" | "month" | "all";
export type PinAggregation = "sum" | "avg" | "min" | "max" | "latest" | "count";
export type PinDisplayFormat = "value" | "bar" | "sparkline";
export type PinMetricId = "streak" | "words" | "entries";

export interface PinConfig {
  id: string;
  source: "metric" | "tracker";
  metricId?: PinMetricId;
  trackerId?: string;
  label: string;
  period: PinPeriod;
  aggregation: PinAggregation;
  target?: number;
  color?: string;
  format: PinDisplayFormat;
  order: number;
  visible: boolean;
}

export interface PinsConfig {
  version: 1;
  items: PinConfig[];
}

export interface BlogViewConfig {
  version: 1;
  title?: string;
  subtitle?: string;
  logo?: string;
  theme: "clean" | "paper" | "magazine" | "notebook";
  menu: Array<{ label: string; href: string }>;
  showMeta: boolean;
  showLogo: boolean;
}

export interface JournalManifest {
  schema: "marklee-journal";
  schemaVersion: number;
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  entryDirectory: string;
  assetDirectory: string;
  defaultLanguage: string;
  trackerDefinitions?: TrackerDefinition[];
  /** Accent color (hex) for this notebook's card in the sidebar. */
  color?: string;
  /** Cover image path relative to the notebook root (e.g. `.marklee/cover.jpg`). */
  cover?: string;
  /** Which Pins metrics show in the sidebar highlights (ids like "metric:words"
   * or "tracker:<id>"). Undefined means "use defaults". */
  pinnedMetrics?: string[];
  pinsConfig?: PinsConfig;
  blogView?: BlogViewConfig;
}

export interface JournalDescriptor {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  schemaVersion: number;
  createdAt: string;
  lastOpenedAt?: string;
  unavailable?: boolean;
  color?: string;
  cover?: string;
}

export interface ManifestCheckResult {
  found: boolean;
  valid: boolean;
  manifest?: JournalManifest;
  error?: string;
}
