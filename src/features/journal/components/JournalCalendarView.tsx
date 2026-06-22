import { Calendar } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalCalendarViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
}

export function JournalCalendarView({ t, tConfig }: JournalCalendarViewProps) {
  return (
    <JournalEmptyState
      icon={<Calendar size={36} />}
      title={t["journal.calendar"] || "Calendar"}
      description={t["journal.emptyStateCalendar"] || "Select a day in the calendar to create or view entries."}
      tConfig={tConfig}
    />
  );
}
