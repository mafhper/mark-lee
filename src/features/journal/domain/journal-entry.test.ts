import assert from "node:assert/strict";
import test from "node:test";
import { parseJournalEntry } from "./journal-entry.parser.ts";
import { serializeJournalEntry } from "./journal-entry.serializer.ts";
import type { JournalEntryMetadata } from "./journal-entry.types.ts";

const SAMPLE_ENTRY = `---
schema: marklee-entry
schemaVersion: 1
id: "01975fd8-0000-7000-8000-000000000000"
date: "2026-06-04T05:10:00-03:00"
title: Fuji at first light
summary: The lake was completely still.
tags:
  - travel
  - japan
mood: great
taskStatus: in_progress
trackers:
  energy: 4
  weather: clear
location:
  label: Lake Kawaguchiko, Yamanashi
  latitude: 35.517
  longitude: 138.755
  source: manual
fields:
  reference: "https://example.com/fuji"
  rating: 5
  reviewed: null
images:
  - id: wide
    path: wide.webp
    alt: Wide lake
    caption: Fuji reflected on the lake
    order: 0
  - id: detail
    path: detail.webp
    order: 1
cover: "../../../assets/01975fd8-0000-7000-8000-000000000000/cover.webp"
favorite: true
attachments:
  - photo-01.jpg
  - photo-02.jpg
createdAt: "2026-06-04T08:10:00Z"
updatedAt: "2026-06-04T09:02:00Z"
---

Set an alarm for 4:20 and almost talked myself out of it.
`;

test("parses complete entry with all fields", () => {
  const result = parseJournalEntry(SAMPLE_ENTRY);
  assert.ok("metadata" in result, "should return ParseResult");
  const { metadata, body } = result as { metadata: JournalEntryMetadata; body: string };

  assert.equal(metadata.schema, "marklee-entry");
  assert.equal(metadata.id, "01975fd8-0000-7000-8000-000000000000");
  assert.equal(metadata.title, "Fuji at first light");
  assert.equal(metadata.tags.length, 2);
  assert.equal(metadata.tags[0], "travel");
  assert.equal(metadata.mood, "great");
  assert.equal(metadata.taskStatus, "in_progress");
  assert.equal(metadata.trackers?.energy, 4);
  assert.equal(metadata.trackers?.weather, "clear");
  assert.equal(metadata.location?.label, "Lake Kawaguchiko, Yamanashi");
  assert.equal(metadata.location?.latitude, 35.517);
  assert.equal(metadata.location?.longitude, 138.755);
  assert.equal(metadata.location?.source, "manual");
  assert.equal(metadata.fields?.reference, "https://example.com/fuji");
  assert.equal(metadata.fields?.rating, 5);
  assert.equal(metadata.fields?.reviewed, null);
  assert.equal(metadata.images?.length, 2);
  assert.equal(metadata.images?.[0]?.path, "wide.webp");
  assert.equal(metadata.images?.[0]?.caption, "Fuji reflected on the lake");
  assert.equal(metadata.cover, "../../../assets/01975fd8-0000-7000-8000-000000000000/cover.webp");
  assert.equal(metadata.favorite, true);
  assert.equal(metadata.attachments?.length, 2);
  assert.ok(body.includes("Set an alarm for 4:20"));
});

test("full round-trip preserves data", () => {
  const result = parseJournalEntry(SAMPLE_ENTRY);
  assert.ok("metadata" in result);
  const { metadata, body } = result as { metadata: JournalEntryMetadata; body: string };

  const serialized = serializeJournalEntry(metadata, body);
  const reparsed = parseJournalEntry(serialized);
  assert.ok("metadata" in reparsed);
  const roundtripped = reparsed as { metadata: JournalEntryMetadata; body: string };

  assert.equal(roundtripped.metadata.title, metadata.title);
  assert.equal(roundtripped.metadata.tags.length, metadata.tags.length);
  assert.equal(roundtripped.metadata.mood, metadata.mood);
  assert.equal(roundtripped.metadata.taskStatus, metadata.taskStatus);
  assert.equal(roundtripped.metadata.trackers?.energy, metadata.trackers?.energy);
  assert.equal(roundtripped.metadata.location?.latitude, metadata.location?.latitude);
  assert.equal(roundtripped.metadata.fields?.reference, metadata.fields?.reference);
  assert.equal(roundtripped.metadata.images?.[1]?.path, metadata.images?.[1]?.path);
  assert.equal(roundtripped.metadata.favorite, metadata.favorite);
  assert.ok(roundtripped.body.includes("Set an alarm for 4:20"));
});

test("parses minimal entry", () => {
  const minimal = `---
schema: marklee-entry
schemaVersion: 1
id: "abc-123"
date: "2026-01-01T00:00:00Z"
title: Minimal
tags: []
createdAt: "2026-01-01T00:00:00Z"
updatedAt: "2026-01-01T00:00:00Z"
---

Hello world.
`;
  const result = parseJournalEntry(minimal);
  assert.ok("metadata" in result);
  const { metadata, body } = result as { metadata: JournalEntryMetadata; body: string };

  assert.equal(metadata.title, "Minimal");
  assert.equal(metadata.tags.length, 0);
  assert.equal(metadata.favorite, false);
  assert.equal(body, "Hello world.\n");
});

test("round-trip minimal entry preserves body exactly", () => {
  const minimal = `---
schema: marklee-entry
schemaVersion: 1
id: "abc-123"
date: "2026-01-01T00:00:00Z"
title: Minimal
tags: []
createdAt: "2026-01-01T00:00:00Z"
updatedAt: "2026-01-01T00:00:00Z"
---

Hello world.
`;
  const result = parseJournalEntry(minimal);
  assert.ok("metadata" in result);
  const { metadata, body } = result as { metadata: JournalEntryMetadata; body: string };
  const serialized = serializeJournalEntry(metadata, body);
  const reparsed = parseJournalEntry(serialized);
  assert.ok("metadata" in reparsed);
  const rt = reparsed as { metadata: JournalEntryMetadata; body: string };
  assert.equal(rt.metadata.title, "Minimal");
  assert.equal(rt.body.trim(), body.trim());
});

test("handles empty tags", () => {
  const result = parseJournalEntry(`---
schema: marklee-entry
schemaVersion: 1
id: "test"
date: "2026-01-01T00:00:00Z"
title: Test
tags: []
createdAt: "2026-01-01T00:00:00Z"
updatedAt: "2026-01-01T00:00:00Z"
---

x
`);
  assert.ok("metadata" in result);
  const { metadata } = result as { metadata: JournalEntryMetadata; body: string };
  assert.deepEqual(metadata.tags, []);
});

test("parses an entry with CRLF (Windows) line endings", () => {
  const lf = `---
schema: marklee-entry
schemaVersion: 1
id: "crlf-1"
date: "2026-01-01T00:00:00Z"
title: Windows
tags:
  - a
createdAt: "2026-01-01T00:00:00Z"
updatedAt: "2026-01-01T00:00:00Z"
---

Body line one.
Body line two.
`;
  const crlf = lf.replace(/\n/g, "\r\n");
  const result = parseJournalEntry(crlf);
  assert.ok("metadata" in result, "CRLF entry should parse (Windows-authored files)");
  const { metadata, body } = result as { metadata: JournalEntryMetadata; body: string };
  assert.equal(metadata.title, "Windows");
  assert.equal(metadata.tags[0], "a");
  assert.ok(body.includes("Body line one."));
  assert.ok(!body.includes("\r"), "body should be normalized to LF");
});

test("handles missing frontmatter", () => {
  const result = parseJournalEntry("No frontmatter here.");
  assert.ok("error" in result);
  assert.ok(result.error!.includes("No frontmatter"));
});

test("handles invalid YAML", () => {
  const result = parseJournalEntry("---\n[\n---\nBody");
  assert.ok("error" in result);
});

test("serializer produces valid markdown with YAML frontmatter", () => {
  const metadata: JournalEntryMetadata = {
    schema: "marklee-entry",
    schemaVersion: 1,
    id: "test-id",
    date: "2026-01-01T00:00:00Z",
    title: "Test Entry",
    tags: ["test"],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  const body = "Some content.";
  const serialized = serializeJournalEntry(metadata, body);
  assert.ok(serialized.startsWith("---\n"));
  assert.ok(serialized.includes("schema: marklee-entry"));
  assert.ok(serialized.includes("---\n\nSome content."));
});

test("ignores invalid field and image values while preserving valid ones", () => {
  const raw = `---
schema: marklee-entry
schemaVersion: 1
id: "invalid-extra"
date: "2026-01-01T00:00:00Z"
title: Invalid extra
tags: []
fields:
  ok: value
  nope:
    nested: true
  flag: true
images:
  - path: one.jpg
  - caption: missing path
  - path: two.jpg
    order: 0
createdAt: "2026-01-01T00:00:00Z"
updatedAt: "2026-01-01T00:00:00Z"
---

Body
`;
  const result = parseJournalEntry(raw);
  assert.ok("metadata" in result);
  const { metadata } = result as { metadata: JournalEntryMetadata; body: string };
  assert.deepEqual(metadata.fields, { ok: "value" });
  assert.deepEqual(metadata.images?.map((image) => image.path), ["one.jpg", "two.jpg"]);
  assert.ok(metadata.images?.every((image, order) => image.order === order));
});

test("round-trips every task status without changing Markdown checklists", () => {
  for (const taskStatus of ["pending", "in_progress", "completed", "cancelled"] as const) {
    const raw = `---
schema: marklee-entry
schemaVersion: 1
id: "task-${taskStatus}"
date: "2026-07-12T00:00:00Z"
title: Task
tags: []
taskStatus: ${taskStatus}
createdAt: "2026-07-12T00:00:00Z"
updatedAt: "2026-07-12T00:00:00Z"
---

- [x] Existing check
- [ ] Next check
`;
    const parsed = parseJournalEntry(raw);
    assert.ok("metadata" in parsed);
    assert.equal(parsed.metadata.taskStatus, taskStatus);
    const serialized = serializeJournalEntry(parsed.metadata, parsed.body);
    const reparsed = parseJournalEntry(serialized);
    assert.ok("metadata" in reparsed);
    assert.equal(reparsed.metadata.taskStatus, taskStatus);
    assert.equal(reparsed.body, parsed.body);
  }
});

test("preserves an unknown external task status without treating it as filterable", () => {
  const raw = `---
schema: marklee-entry
schemaVersion: 1
id: "external-task"
date: "2026-07-12T00:00:00Z"
title: External task
tags: []
taskStatus: waiting_review
createdAt: "2026-07-12T00:00:00Z"
updatedAt: "2026-07-12T00:00:00Z"
---

Body
`;
  const parsed = parseJournalEntry(raw);
  assert.ok("metadata" in parsed);
  assert.equal(parsed.metadata.taskStatus, undefined);
  assert.equal(parsed.metadata.extraFrontmatter?.taskStatus, "waiting_review");
  const serialized = serializeJournalEntry(parsed.metadata, parsed.body);
  assert.match(serialized, /taskStatus: waiting_review/);
});
