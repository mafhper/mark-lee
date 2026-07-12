import assert from "node:assert/strict";
import test from "node:test";
import { preprocessMarkdown } from "./preprocessMarkdown.ts";

test("normalizes legacy absolute Windows image destinations with spaces", () => {
  const source = "![Image](D:/mafhp/Pictures/Capturas/Captura de tela (final).png)";
  assert.equal(
    preprocessMarkdown(source),
    "![Image](D:/mafhp/Pictures/Capturas/Captura%20de%20tela%20%28final%29.png)",
  );
});

test("does not rewrite image-like text inside fenced code", () => {
  const source = "```md\n![Image](D:/folder/image with space.png)\n```";
  assert.equal(preprocessMarkdown(source), source);
});
