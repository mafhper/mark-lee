import assert from "node:assert/strict";
import test from "node:test";
import type { EntryRecord } from "./entry-service.ts";
import type { JournalTaskStatus } from "./journal-entry.types.ts";
import { collectTaskStatusCounts, countTaskMetric, filterEntriesByTaskStatus, hasJournalTasks } from "./task-status.ts";

function entry(id: string, taskStatus?: JournalTaskStatus): EntryRecord {
  return {
    path: `${id}.md`,
    body: "",
    wordCount: 0,
    metadata: {
      schema: "marklee-entry",
      schemaVersion: 1,
      id,
      date: "2026-07-12T00:00:00Z",
      title: id,
      tags: [],
      taskStatus,
      createdAt: "2026-07-12T00:00:00Z",
      updatedAt: "2026-07-12T00:00:00Z",
    },
  };
}

test("counts and filters only entries with a valid task status", () => {
  const entries = [entry("a", "pending"), entry("b", "in_progress"), entry("c", "pending"), entry("d")];
  assert.deepEqual(collectTaskStatusCounts(entries), { pending: 2, in_progress: 1, completed: 0, cancelled: 0 });
  assert.deepEqual(filterEntriesByTaskStatus(entries, "pending").map((item) => item.metadata.id), ["a", "c"]);
  assert.equal(hasJournalTasks(entries), true);
  assert.equal(hasJournalTasks([entry("plain")]), false);
});

test("an empty task filter preserves the complete entry list", () => {
  const entries = [entry("a", "completed"), entry("b")];
  assert.equal(filterEntriesByTaskStatus(entries, null), entries);
});

test("moving a task to completed removes it from the in-progress view and updates counts", () => {
  const entries = [entry("active", "in_progress"), entry("done", "in_progress")];
  const updated = entries.map((item) => item.metadata.id === "done"
    ? { ...item, metadata: { ...item.metadata, taskStatus: "completed" as const } }
    : item);

  assert.deepEqual(collectTaskStatusCounts(updated), {
    pending: 0,
    in_progress: 1,
    completed: 1,
    cancelled: 0,
  });
  assert.deepEqual(
    filterEntriesByTaskStatus(updated, "in_progress").map((item) => item.metadata.id),
    ["active"],
  );
});

test("computes task pin metrics from task status", () => {
  const entries = [
    entry("pending", "pending"),
    entry("active", "in_progress"),
    entry("done", "completed"),
    entry("cancelled", "cancelled"),
    entry("plain"),
  ];

  assert.equal(countTaskMetric(entries, "tasks_created"), 4);
  assert.equal(countTaskMetric(entries, "tasks_in_progress"), 1);
  assert.equal(countTaskMetric(entries, "tasks_completed"), 1);
});
