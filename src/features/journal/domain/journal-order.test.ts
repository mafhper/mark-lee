import assert from "node:assert/strict";
import test from "node:test";
import type { JournalDescriptor } from "./journal.types.ts";
import { orderJournalsForNavigation } from "./journal-order.ts";

function journal(id: string, createdAt: string, lastOpenedAt?: string): JournalDescriptor {
  return { id, name: id, rootPath: id, schemaVersion: 1, createdAt, lastOpenedAt };
}

test("orders the open notebook first and then the most recently opened", () => {
  const journals = [
    journal("old", "2026-01-01T00:00:00Z", "2026-07-01T00:00:00Z"),
    journal("recent", "2026-01-02T00:00:00Z", "2026-07-12T10:00:00Z"),
    journal("active", "2025-01-01T00:00:00Z", "2026-06-01T00:00:00Z"),
    journal("middle", "2026-01-03T00:00:00Z", "2026-07-10T10:00:00Z"),
  ];

  assert.deepEqual(
    orderJournalsForNavigation(journals, "active").map((item) => item.id),
    ["active", "recent", "middle", "old"],
  );
});

test("falls back to creation date and keeps stable order on ties", () => {
  const journals = [
    journal("first", "2026-07-10T00:00:00Z"),
    journal("newest", "2026-07-12T00:00:00Z"),
    journal("second", "2026-07-10T00:00:00Z"),
  ];

  assert.deepEqual(
    orderJournalsForNavigation(journals, null).map((item) => item.id),
    ["newest", "first", "second"],
  );
});
