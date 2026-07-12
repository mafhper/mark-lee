import assert from "node:assert/strict";
import test from "node:test";
import { entryHeaderMediaHtml } from "./export-html.ts";
import type { EntryRecord } from "./entry-service.ts";

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    path: "C:/journal/entries/2026/01/entry.md",
    body: "",
    wordCount: 0,
    metadata: {
      schema: "marklee-entry",
      schemaVersion: 1,
      id: "entry-1",
      date: "2026-01-01T00:00:00Z",
      title: "Entry",
      tags: [],
      cover: "cover.jpg",
      images: [
        { id: "bad", path: "../bad.jpg", order: 0, alt: "Bad" },
        { id: "one", path: "gallery/one.jpg", order: 1, alt: "One", caption: "Caption <safe>" },
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

test("renders safe cover and header gallery images before exported body", () => {
  const html = entryHeaderMediaHtml(entry());

  assert.ok(html.includes('class="entry-cover"'));
  assert.ok(html.includes('src="cover.jpg"'));
  assert.ok(html.includes('class="entry-gallery"'));
  assert.ok(html.includes('src="gallery/one.jpg"'));
  assert.ok(html.includes('alt="One"'));
  assert.ok(html.includes("<figcaption>Caption &lt;safe&gt;</figcaption>"));
});

test("skips unsafe header image references", () => {
  const html = entryHeaderMediaHtml(entry());

  assert.ok(!html.includes("../bad.jpg"));
  assert.ok(!html.includes("Bad"));
});
