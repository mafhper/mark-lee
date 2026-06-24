export interface TrackerDefinition {
  id: string;
  name: string;
  type: "number" | "string" | "boolean";
  unit?: string;
  icon?: string;
  color?: string;
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
