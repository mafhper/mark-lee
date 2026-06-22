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
}

export interface ManifestCheckResult {
  found: boolean;
  valid: boolean;
  manifest?: JournalManifest;
  error?: string;
}
