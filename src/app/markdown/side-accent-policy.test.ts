import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const forbiddenPatterns = [
  ["src/constants.ts", /\bborder-l-\d/],
  ["src/features/journal/components/JournalListView.tsx", /\bborderLeft\b/],
  ["src/features/journal/components/JournalNavigation.tsx", /\bborderLeft\b/],
  ["src/index.css", /border-left:\s*(?:var\(--ml-preview-quote|3px solid)/],
  ["src/services/publication-style.ts", /border-left:\s*var\(--ml-preview-quote/],
  ["src/features/journal/domain/md-to-html.ts", /blockquote\s*\{[^}]*border-left:/s],
  ["apps/site/src/index.css", /\.marklee-tab\s*\{[^}]*border-right:/s],
] as const;

describe("side accent border policy", () => {
  it("não permite bordas laterais decorativas nas superfícies visuais", () => {
    for (const [file, pattern] of forbiddenPatterns) {
      assert.doesNotMatch(readFileSync(file, "utf8"), pattern, file);
    }
  });
});
