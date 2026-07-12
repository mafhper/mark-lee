export interface JournalEntryHeaderImage {
  id: string;
  path: string;
  alt?: string;
  caption?: string;
  order: number;
}

export const JOURNAL_TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type JournalTaskStatus = typeof JOURNAL_TASK_STATUSES[number];

export function isJournalTaskStatus(value: unknown): value is JournalTaskStatus {
  return typeof value === "string" && JOURNAL_TASK_STATUSES.includes(value as JournalTaskStatus);
}

export interface JournalEntryMetadata {
  schema: "marklee-entry";
  schemaVersion: number;
  id: string;
  date: string;
  title: string;
  summary?: string;
  tags: string[];
  mood?: string;
  taskStatus?: JournalTaskStatus;
  trackers?: Record<string, string | number | boolean | null>;
  location?: {
    label: string;
    latitude?: number;
    longitude?: number;
    source?: "manual" | "device" | "search";
    city?: string;
    state?: string;
    country?: string;
    attraction?: string;
  };
  fields?: Record<string, string | number | null>;
  images?: JournalEntryHeaderImage[];
  cover?: string;
  favorite?: boolean;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  extraFrontmatter?: Record<string, unknown>;
}
