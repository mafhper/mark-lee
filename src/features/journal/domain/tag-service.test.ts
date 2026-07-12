import assert from "node:assert/strict";
import test from "node:test";
import { collectTagStats, filterEntriesByTags } from "./tag-service.ts";
import type { EntryRecord } from "./entry-service.ts";

function entry(id: string, tags: string[]): EntryRecord {
  return {
    path: `${id}.md`,
    body: "",
    wordCount: 0,
    metadata: {
      schema: "marklee-entry",
      schemaVersion: 1,
      id,
      date: "2026-01-01T00:00:00Z",
      title: id,
      tags,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  };
}

test("filters by multiple tags using AND semantics", () => {
  const entries = [entry("a", ["dev", "bug"]), entry("b", ["dev"]), entry("c", ["bug"])];
  assert.deepEqual(filterEntriesByTags(entries, ["dev", "bug"]).map((item) => item.metadata.id), ["a"]);
});

test("collects tag stats by use count", () => {
  const stats = collectTagStats([entry("a", ["dev", "bug"]), entry("b", ["dev"])]);
  assert.deepEqual(stats.map((stat) => `${stat.tag}:${stat.count}`), ["dev:2", "bug:1"]);
});
