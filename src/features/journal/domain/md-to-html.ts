function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ALLOWED_URL_SCHEMES = /^(https?:\/|mailto:|#|\/)/;
const DATA_IMAGE_RE = /^data:image\//;
const HAS_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Relative asset paths (e.g. `foo.png`, `./foo.png`, `assets/foo.png`) are emitted
 * by the entry body and copied alongside the exported HTML, so they must survive
 * sanitization to render. We still reject anything that carries a scheme, is
 * protocol-relative, uses backslashes, or escapes its directory with `..`.
 */
function isSafeRelativePath(path: string): boolean {
  if (!path) return false;
  if (HAS_SCHEME_RE.test(path)) return false; // javascript:, http:, etc.
  if (path.startsWith("//")) return false; // protocol-relative
  if (path.startsWith("/") || path.startsWith("\\")) return false; // absolute
  if (path.includes("\\")) return false; // no Windows separators in URLs
  return !path.split("/").includes(".."); // no parent-directory escape
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (DATA_IMAGE_RE.test(trimmed)) return trimmed;
  if (ALLOWED_URL_SCHEMES.test(trimmed)) return trimmed;
  if (isSafeRelativePath(trimmed)) return trimmed;
  return "";
}

function inlineMarkdown(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safe = sanitizeUrl(url);
    return safe ? `<img src="${safe}" alt="${alt}" />` : "";
  });
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    const safe = sanitizeUrl(url);
    return safe ? `<a href="${safe}">${text}</a>` : escapeHtml(text);
  });
  return result;
}

export function mdToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let i = 0;

  function processList(): string {
    const items: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      const liMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (!liMatch) break;
      items.push(liMatch[2]);
      i++;
    }
    if (items.length === 0) return "";
    const lis = items.map((item) => `<li>${inlineMarkdown(item.trim())}</li>`).join("\n");
    return `<ul>\n${lis}\n</ul>`;
  }

  function processOrderedList(): string {
    const items: string[] = [];
    while (i < lines.length) {
      const line = lines[i];
      const liMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (!liMatch) break;
      items.push(liMatch[1]);
      i++;
    }
    if (items.length === 0) return "";
    const lis = items.map((item) => `<li>${inlineMarkdown(item.trim())}</li>`).join("\n");
    return `<ol>\n${lis}\n</ol>`;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Code block
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const lang = codeMatch[1] ? ` class="language-${escapeHtml(codeMatch[1])}"` : "";
      html.push(`<pre><code${lang}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote>${inlineMarkdown(quoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      html.push("<hr />");
      i++;
      continue;
    }

    // Header
    const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      html.push(`<h${level}>${inlineMarkdown(hMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      html.push(processOrderedList());
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      html.push(processList());
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !lines[i].startsWith("```") && !lines[i].startsWith(">") && !/^[-*+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      html.push(`<p>${inlineMarkdown(paraLines.join("<br />"))}</p>`);
    }
  }

  return html.join("\n");
}

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; background: #fafafa; padding: 40px 20px; }
  .container { max-width: 720px; margin: 0 auto; background: #fff; padding: 40px 48px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  h1 { font-size: 1.75em; margin-bottom: 0.5em; color: #1a1a2e; }
  h2 { font-size: 1.4em; margin-top: 1.5em; margin-bottom: 0.4em; color: #2d2d44; }
  h3 { font-size: 1.15em; margin-top: 1.2em; margin-bottom: 0.3em; color: #2d2d44; }
  p { margin-bottom: 1em; }
  a { color: #3b82f6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; height: auto; border-radius: 4px; margin: 1em 0; }
  pre { background: #f1f5f9; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
  code { font-family: "SF Mono", "Fira Code", monospace; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  blockquote { position: relative; padding: 10px 0 10px 16px; color: #64748b; margin: 1em 0; }
  blockquote::before { content: ""; position: absolute; left: 0; top: 10px; bottom: 10px; width: 2px; background: #64748b; opacity: 0.55; }
  ul, ol { margin: 0.5em 0 1em 1.5em; }
  li { margin-bottom: 0.25em; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  .meta { font-size: 0.85em; color: #94a3b8; margin-bottom: 2em; }
</style>
</head>
<body>
<div class="container">
{{CONTENT}}
</div>
</body>
</html>`;

export function wrapHtmlPage(bodyHtml: string): string {
  return HTML_TEMPLATE.replace("{{CONTENT}}", bodyHtml);
}
