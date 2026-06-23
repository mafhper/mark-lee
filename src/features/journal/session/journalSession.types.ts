import type { EntryRecord } from "../domain/entry-service";

export type JournalScope = "all" | "favorites" | "on-this-day";
export type JournalView = "list" | "calendar" | "map" | "gallery";

export interface JournalQuery {
  scope: JournalScope;
  search: string;
  tags: string[];
  hasImages?: boolean;
  hasLocation?: boolean;
}

export interface JournalFileError {
  path: string;
  error: string;
}

export interface JournalSessionState {
  rootPath: string | null;
  entries: EntryRecord[];
  fileErrors: JournalFileError[];
  revision: number;
  loading: boolean;
  loadProgress: { loaded: number; total: number } | null;
}

export type JournalSessionAction =
  | { type: "LOAD_START"; rootPath: string }
  | { type: "LOAD_PROGRESS"; loaded: number; total: number }
  | { type: "LOAD_COMPLETE"; entries: EntryRecord[]; fileErrors: JournalFileError[] }
  | { type: "LOAD_ERROR" }
  | { type: "ADD_ENTRY"; entry: EntryRecord }
  | { type: "UPDATE_ENTRY"; entry: EntryRecord }
  | { type: "REMOVE_ENTRY"; entryId: string }
  | { type: "INCREMENT_REVISION" };
