import assert from "node:assert/strict";
import test from "node:test";
import { safeRelativeAssetPath, resolveEntryAssetPath } from "./export-paths.ts";

test("accepts a plain relative file name", () => {
  assert.equal(safeRelativeAssetPath("photo.png"), "photo.png");
});

test("normalizes a leading ./", () => {
  assert.equal(safeRelativeAssetPath("./photo.png"), "photo.png");
});

test("keeps nested relative directories", () => {
  assert.equal(safeRelativeAssetPath("assets/2026/photo.png"), "assets/2026/photo.png");
});

test("collapses interior . segments", () => {
  assert.equal(safeRelativeAssetPath("assets/./photo.png"), "assets/photo.png");
});

test("rejects parent-directory escapes", () => {
  assert.equal(safeRelativeAssetPath("../secret.png"), null);
  assert.equal(safeRelativeAssetPath("../../etc/passwd"), null);
  assert.equal(safeRelativeAssetPath("assets/../../secret.png"), null);
});

test("rejects POSIX absolute paths", () => {
  assert.equal(safeRelativeAssetPath("/etc/passwd"), null);
});

test("rejects Windows drive letters and UNC paths", () => {
  assert.equal(safeRelativeAssetPath("C:/Windows/system32"), null);
  assert.equal(safeRelativeAssetPath("\\\\server\\share\\x.png"), null);
});

test("rejects URL schemes and protocol-relative refs", () => {
  assert.equal(safeRelativeAssetPath("http://example.com/x.png"), null);
  assert.equal(safeRelativeAssetPath("data:image/png;base64,AAAA"), null);
  assert.equal(safeRelativeAssetPath("javascript:alert(1)"), null);
  assert.equal(safeRelativeAssetPath("//evil.com/x.png"), null);
});

test("rejects backslash-encoded traversal after decoding", () => {
  assert.equal(safeRelativeAssetPath("..%2F..%2Fsecret.png"), null);
});

test("rejects empty and whitespace-only refs", () => {
  assert.equal(safeRelativeAssetPath(""), null);
  assert.equal(safeRelativeAssetPath("   "), null);
});

const ENTRY = "/notebook/entries/2026/06/2026-06-24--101010--abc.md";
const ENTRY_DIR = "/notebook/entries/2026/06";

test("resolveEntryAssetPath joins a safe ref to the entry directory", () => {
  assert.equal(resolveEntryAssetPath(ENTRY, "photo.png"), `${ENTRY_DIR}/photo.png`);
  assert.equal(resolveEntryAssetPath(ENTRY, "./assets/a.png"), `${ENTRY_DIR}/assets/a.png`);
});

test("resolveEntryAssetPath rejects traversal and external refs", () => {
  assert.equal(resolveEntryAssetPath(ENTRY, "../../../secret.png"), null);
  assert.equal(resolveEntryAssetPath(ENTRY, "/etc/passwd"), null);
  assert.equal(resolveEntryAssetPath(ENTRY, "C:/Windows/x.png"), null);
  assert.equal(resolveEntryAssetPath(ENTRY, "http://evil.com/x.png"), null);
  assert.equal(resolveEntryAssetPath(ENTRY, "data:image/png;base64,AAAA"), null);
});
