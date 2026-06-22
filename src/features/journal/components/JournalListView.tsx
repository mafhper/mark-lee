import { FileText } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalListViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
}

export function JournalListView({ t, tConfig }: JournalListViewProps) {
  return (
    <JournalEmptyState
      icon={<FileText size={36} />}
      title={t["journal.list"] || "List"}
      description={t["journal.emptyStateEntries"] || "No entries yet.\nClick \"New entry\" to start your journal."}
      tConfig={tConfig}
    />
  );
}
