import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePreviewLink } from "./resolvePreviewLink.ts";

describe("resolvePreviewLink", () => {
  it("classifica http:// como external", () => {
    const result = resolvePreviewLink("http://example.com", "http://example.com/");
    assert.equal(result.kind, "external");
  });

  it("classifica https:// como external", () => {
    const result = resolvePreviewLink("https://example.com/path", "https://example.com/path");
    assert.equal(result.kind, "external");
  });

  it("classifica #section como anchor", () => {
    const result = resolvePreviewLink("#section", "#section");
    assert.equal(result.kind, "anchor");
  });

  it("classifica mailto: como email", () => {
    const result = resolvePreviewLink("mailto:user@example.com", "mailto:user@example.com");
    assert.equal(result.kind, "email");
  });

  it("classifica caminho relativo como local-file", () => {
    const result = resolvePreviewLink("./other.md", "http://127.0.0.1:5173/other.md");
    assert.equal(result.kind, "local-file");
    assert.equal(result.originalHref, "./other.md");
  });

  it("classifica caminho absoluto como local-file", () => {
    const result = resolvePreviewLink("/docs/readme.md", "http://127.0.0.1:5173/docs/readme.md");
    assert.equal(result.kind, "local-file");
  });

  it("classifica protocolos desconhecidos como unsupported", () => {
    const result = resolvePreviewLink("javascript:alert(1)", "javascript:alert(1)");
    assert.equal(result.kind, "unsupported");
  });

  it("classifica href vazio como unsupported", () => {
    const result = resolvePreviewLink("", "");
    assert.equal(result.kind, "unsupported");
  });

  it("preserva originalHref mesmo quando resolvedHref difere", () => {
    const result = resolvePreviewLink("./page.md", "http://127.0.0.1:5173/page.md");
    assert.equal(result.originalHref, "./page.md");
    assert.equal(result.resolvedHref, "http://127.0.0.1:5173/page.md");
  });
});
