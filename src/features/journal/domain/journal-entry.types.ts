export interface JournalEntryMetadata {
  schema: "marklee-entry";
  schemaVersion: number;
  id: string;
  date: string;
  title: string;
  summary?: string;
  tags: string[];
  mood?: string;
  trackers?: Record<string, string | number | boolean | null>;
  location?: {
    label: string;
    latitude?: number;
    longitude?: number;
    source?: "manual" | "device" | "search";
  };
  cover?: string;
  favorite?: boolean;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}
