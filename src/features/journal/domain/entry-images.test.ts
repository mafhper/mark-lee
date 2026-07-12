import assert from "node:assert/strict";
import test from "node:test";
import { collectEntryAssetRefs, collectEntryImageRefs, replaceInlineImageRef } from "./entry-images.ts";
import type { EntryRecord } from "./entry-service.ts";

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    path: "C:/journal/entries/2026/01/entry.md",
    body: "Inline ![A](photo.jpg)\n\nUnsafe ![B](../escape.jpg)\n\nRemote ![C](https://example.com/x.jpg)",
    wordCount: 3,
    metadata: {
      schema: "marklee-entry",
      schemaVersion: 1,
      id: "entry-1",
      date: "2026-01-01T00:00:00Z",
      title: "Entry",
      tags: [],
      cover: "cover.jpg",
      images: [
        { id: "header-2", path: "gallery/two.jpg", order: 1, caption: "Two" },
        { id: "header-1", path: "gallery/one.jpg", order: 0, alt: "One" },
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

test("collects cover, header images, and safe inline images in display order", () => {
  const refs = collectEntryImageRefs(entry());
  assert.deepEqual(refs.map((ref) => ref.kind), ["cover", "header", "header", "inline"]);
  assert.deepEqual(refs.map((ref) => ref.ref), ["cover.jpg", "gallery/one.jpg", "gallery/two.jpg", "photo.jpg"]);
});

test("collects safe asset refs for export without duplicates or traversal", () => {
  const refs = collectEntryAssetRefs(entry({ body: "![A](photo.jpg)\n![Dup](photo.jpg)\n![Bad](../bad.jpg)" }));
  assert.deepEqual(refs, ["cover.jpg", "gallery/one.jpg", "gallery/two.jpg", "photo.jpg"]);
});

test("replaces an inline image by occurrence index", () => {
  const next = replaceInlineImageRef("![A](a.jpg)\n![B](b.jpg)", 1, "c.webp");
  assert.equal(next, "![A](a.jpg)\n![B](c.webp)");
});
