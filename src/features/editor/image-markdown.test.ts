import assert from "node:assert/strict";
import test from "node:test";
import { buildMarkdownImageSyntax, normalizeMarkdownImagePath } from "./image-markdown.ts";

test("normalizes imported image references as explicit relative paths", () => {
  assert.equal(normalizeMarkdownImagePath("photo.webp"), "./photo.webp");
  assert.equal(normalizeMarkdownImagePath(".\\media\\photo.png"), "./media/photo.png");
});

test("encodes spaces and Markdown-sensitive path characters", () => {
  assert.equal(
    normalizeMarkdownImagePath("photos/my trip (final)#1.png"),
    "./photos/my%20trip%20%28final%29%231.png",
  );
});

test("builds image syntax without changing an already relative path", () => {
  assert.equal(buildMarkdownImageSyntax("./cover.webp", "Cover"), "![Cover](./cover.webp)");
});
