import assert from "node:assert/strict";
import test from "node:test";
import { mdToHtml, wrapHtmlPage } from "./md-to-html.ts";

test("converts headers", () => {
  const html = mdToHtml("# H1\n## H2\n### H3");
  assert.ok(html.includes("<h1>H1</h1>"));
  assert.ok(html.includes("<h2>H2</h2>"));
  assert.ok(html.includes("<h3>H3</h3>"));
});

test("converts bold and italic", () => {
  const html = mdToHtml("**bold** and *italic*");
  assert.ok(html.includes("<strong>bold</strong>"));
  assert.ok(html.includes("<em>italic</em>"));
});

test("converts inline code", () => {
  const html = mdToHtml("Use `code` here");
  assert.ok(html.includes("<code>code</code>"));
});

test("converts links", () => {
  const html = mdToHtml("[text](https://example.com)");
  assert.ok(html.includes('<a href="https://example.com">text</a>'));
});

test("converts images", () => {
  const html = mdToHtml("![alt](img.png)");
  assert.ok(html.includes('<img src="img.png" alt="alt" />'));
});

test("converts unordered lists", () => {
  const html = mdToHtml("- item1\n- item2");
  assert.ok(html.includes("<ul>"));
  assert.ok(html.includes("<li>item1</li>"));
  assert.ok(html.includes("<li>item2</li>"));
  assert.ok(html.includes("</ul>"));
});

test("converts ordered lists", () => {
  const html = mdToHtml("1. first\n2. second");
  assert.ok(html.includes("<ol>"));
  assert.ok(html.includes("<li>first</li>"));
  assert.ok(html.includes("<li>second</li>"));
  assert.ok(html.includes("</ol>"));
});

test("converts code blocks with language", () => {
  const html = mdToHtml("```js\nconst x = 1;\n```");
  assert.ok(html.includes('<pre><code class="language-js">'));
  assert.ok(html.includes("const x = 1;"));
  assert.ok(html.includes("</code></pre>"));
});

test("converts blockquotes", () => {
  const html = mdToHtml("> A quote");
  assert.ok(html.includes("<blockquote>"));
  assert.ok(html.includes("A quote"));
  assert.ok(html.includes("</blockquote>"));
});

test("converts horizontal rules", () => {
  const html = mdToHtml("---");
  assert.ok(html.includes("<hr />"));
});

test("escapes HTML in text", () => {
  const html = mdToHtml("<script>alert('xss')</script>");
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("converts paragraphs", () => {
  const html = mdToHtml("First paragraph.\n\nSecond paragraph.");
  assert.ok(html.includes("<p>First paragraph.</p>"));
  assert.ok(html.includes("<p>Second paragraph.</p>"));
});

test("converts strikethrough", () => {
  const html = mdToHtml("~~deleted~~");
  assert.ok(html.includes("<del>deleted</del>"));
});

test("wrapHtmlPage produces valid document structure", () => {
  const result = wrapHtmlPage("<p>Hello</p>");
  assert.ok(result.startsWith("<!DOCTYPE html>"));
  assert.ok(result.includes("<html"));
  assert.ok(result.includes("</html>"));
  assert.ok(result.includes("<p>Hello</p>"));
  assert.ok(result.includes("</body>"));
});
