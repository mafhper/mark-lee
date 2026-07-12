import type { EntryRecord } from "./entry-service";
import { JOURNAL_TASK_STATUSES, type JournalTaskStatus } from "./journal-entry.types.ts";

export type JournalTaskStatusCounts = Record<JournalTaskStatus, number>;
export type JournalTaskMetric = "tasks_created" | "tasks_in_progress" | "tasks_completed";

export function collectTaskStatusCounts(entries: EntryRecord[]): JournalTaskStatusCounts {
  const counts: JournalTaskStatusCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const entry of entries) {
    if (entry.metadata.taskStatus) counts[entry.metadata.taskStatus] += 1;
  }
  return counts;
}

export function filterEntriesByTaskStatus(
  entries: EntryRecord[],
  status: JournalTaskStatus | null | undefined,
): EntryRecord[] {
  if (!status) return entries;
  return entries.filter((entry) => entry.metadata.taskStatus === status);
}

export function hasJournalTasks(entries: EntryRecord[]): boolean {
  return entries.some((entry) => JOURNAL_TASK_STATUSES.includes(entry.metadata.taskStatus as JournalTaskStatus));
}

export function countTaskMetric(entries: EntryRecord[], metric: JournalTaskMetric): number {
  if (metric === "tasks_in_progress") {
    return entries.filter((entry) => entry.metadata.taskStatus === "in_progress").length;
  }
  if (metric === "tasks_completed") {
    return entries.filter((entry) => entry.metadata.taskStatus === "completed").length;
  }
  return entries.filter((entry) => JOURNAL_TASK_STATUSES.includes(entry.metadata.taskStatus as JournalTaskStatus)).length;
}
