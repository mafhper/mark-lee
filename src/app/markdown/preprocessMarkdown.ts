function protectCode(markdown: string) {
  const codeBlocks: string[] = [];
  const placeholder = (content: string) => {
    const id = codeBlocks.length;
    codeBlocks.push(content);
    return `\uE000${id}\uE001`;
  };

  // Protect fenced code blocks
  let protectedMd = markdown.replace(/((?:^|\n)(?:`{3,}|~{3,})[\s\S]*?(?:\n(?:`{3,}|~{3,})|$))/g, (match) => placeholder(match));
  
  // Protect inline code spans
  protectedMd = protectedMd.replace(/(`+)([\s\S]*?)\1/g, (match) => placeholder(match));

  return { protectedMd, codeBlocks };
}

function restoreCode(markdown: string, codeBlocks: string[]) {
  return markdown.replace(/\uE000(\d+)\uE001/g, (_match, id) => codeBlocks[Number(id)]);
}

function parseDimensionAttributes(rawAttributes: string) {
  const width = rawAttributes.match(/\bwidth\s*=\s*"?([0-9]+%?)"?/i)?.[1];
  const height = rawAttributes.match(/\bheight\s*=\s*"?([0-9]+%?)"?/i)?.[1];
  return { width, height };
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseImageTarget(rawTarget: string) {
  const trimmed = rawTarget.trim();
  const quotedMatch = trimmed.match(/^(.+?)\s+["']([^"']+)["']$/);
  if (!quotedMatch) return { src: trimmed, title: "" };
  return { src: quotedMatch[1].trim(), title: quotedMatch[2].trim() };
}

function imageToHtml(alt: string, rawTarget: string, rawAttributes: string) {
  const { src, title } = parseImageTarget(rawTarget);
  const { width, height } = parseDimensionAttributes(rawAttributes);
  const attributes = [
    `src="${escapeHtmlAttribute(src)}"`,
    `alt="${escapeHtmlAttribute(alt)}"`,
    title ? `title="${escapeHtmlAttribute(title)}"` : "",
    width ? `width="${escapeHtmlAttribute(width)}"` : "",
    height ? `height="${escapeHtmlAttribute(height)}"` : "",
  ].filter(Boolean);

  return `<img ${attributes.join(" ")} />`;
}

function normalizeImageAttributes(markdown: string) {
  return markdown.replace(
    /!\[([^\]]*)\]\(([^)\n]+)\)\{([^}\n]+)\}/g,
    (_match, alt: string, target: string, attrs: string) =>
      imageToHtml(alt, target, attrs)
  );
}

function normalizeObsidianImages(markdown: string) {
  return markdown.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
    const cleanTarget = target.trim();
    const alt = (label || cleanTarget).trim();
    const href = cleanTarget.startsWith(".") || cleanTarget.includes("/") || /^[a-zA-Z]:[\\/]/.test(cleanTarget)
      ? cleanTarget
      : `./${cleanTarget}`;
    return `![${alt}](${href})`;
  });
}

function normalizeWikilinks(markdown: string) {
  return markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
    const cleanTarget = target.trim();
    const text = (label || cleanTarget).trim();
    return `[${text}](#${encodeURIComponent(cleanTarget)})`;
  });
}

function normalizeCitations(markdown: string) {
  return markdown.replace(/\[((?:-?@[\w:-]+(?:[,;][^\]]*)?)(?:;\s*-?@[\w:-]+(?:[,;][^\]]*)?)*)\]/g, (_match, body: string) => {
    const label = body.replace(/@/g, "").replace(/\s+/g, " ").trim();
    return `<cite class="ml-preview-citation">${escapeHtmlAttribute(label)}</cite>`;
  });
}

function normalizePandocFencedDivs(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  const stack: Array<{ marker: string; kind: string }> = [];

  for (const line of lines) {
    const open = line.match(/^(:{3,})\s*(.*)$/);
    if (open) {
      const [, marker, rawMeta] = open;
      if (stack.length > 0 && marker.length <= stack[stack.length - 1].marker.length && !rawMeta.trim()) {
        output.push("</div>");
        stack.pop();
        continue;
      }

      const meta = rawMeta.trim();
      if (!meta) {
        if (stack.length > 0) {
          output.push("</div>");
          stack.pop();
        } else {
          output.push(line);
        }
        continue;
      }

      const classFromBraces = meta.match(/\{([^}]*)\}/)?.[1].match(/\.([\w-]+)/)?.[1];
      const classFromWord = meta.match(/^([\w-]+)/)?.[1];
      const kind = classFromBraces || classFromWord || "note";
      output.push(`<div class="ml-preview-extension-block" data-extension="${escapeHtmlAttribute(kind)}">`);
      stack.push({ marker, kind });
      continue;
    }

    output.push(line);
  }

  while (stack.length > 0) {
    output.push("</div>");
    stack.pop();
  }

  return output.join("\n");
}

function normalizeMkDocsAdmonitions(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)(!!!|\?\?\?)\s+([\w-]+)(?:\s+["']([^"']+)["'])?\s*$/);
    if (!match) {
      output.push(lines[index]);
      continue;
    }

    const [indent, , marker, rawKind, title] = match;
    const kind = rawKind.toUpperCase();
    const collapsible = marker === "???";
    output.push(`${indent}> [!${kind}]${collapsible ? " Collapsible" : ""}${title ? ` ${title}` : ""}`);

    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      if (!next.trim()) {
        output.push(`${indent}>`);
        index += 1;
        continue;
      }
      const content = next.match(/^(?: {4}|\t)(.*)$/);
      if (!content) break;
      output.push(`${indent}> ${content[1]}`);
      index += 1;
    }
  }

  return output.join("\n");
}

function normalizeMystDirectives(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let directive: string | null = null;
  let directiveIndent = "";

  for (const line of lines) {
    const open = line.match(/^(\s*):::\{([\w-]+)\}\s*$/);
    if (open) {
      directiveIndent = open[1];
      directive = open[2].toUpperCase();
      output.push(`${directiveIndent}> [!${directive}]`);
      continue;
    }

    if (directive && line.match(/^\s*:::\s*$/)) {
      output.push(`${directiveIndent}>`);
      directive = null;
      continue;
    }

    output.push(directive ? `${directiveIndent}> ${line.trimStart()}` : line);
  }

  return output.join("\n");
}

// A CSS hex color: exactly 3, 4, 6 or 8 hex digits (#rgb / #rgba / #rrggbb / #rrggbbaa).
const HEX_COLOR = /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function normalizeTags(markdown: string) {
  // Only treat `#token` as a tag when the token contains at least one letter and
  // is not a hex color. This stops the old regex from turning issue numbers
  // (`#42`), hex colors (`#fff`, `#1d4ed8`) and prices (`#10`) into tag pills.
  // `/` is intentionally excluded from the token (`#path/sub` is rarely a tag).
  return markdown.replace(
    /(^|\s)#([\p{L}\p{N}_-]*\p{L}[\p{L}\p{N}_-]*)/gu,
    (match, prefix: string, tag: string) => {
      if (HEX_COLOR.test(tag)) return match;
      const escaped = escapeHtmlAttribute(tag);
      return `${prefix}<span class="ml-preview-tag" data-tag="${escaped}">#${escaped}</span>`;
    },
  );
}

function normalizeInlineExtensions(markdown: string) {
  return markdown
    .replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
    .replace(/\+\+([^+\n]+)\+\+/g, "<ins>$1</ins>")
    .replace(/(?<!-)--([^- \n][^-\n]*?)--(?!-)/g, "<del>$1</del>")
    .replace(/(?<!~)~([^~\n]+)~(?!~)/g, "<sub>$1</sub>")
    .replace(/\^([^^\n]+)\^/g, "<sup>$1</sup>");
}

export function preprocessMarkdown(content: string) {
  const { protectedMd, codeBlocks } = protectCode(content);

  const processed = normalizeInlineExtensions(
    normalizeTags(
      normalizeCitations(
        normalizeWikilinks(
          normalizeMystDirectives(
            normalizeMkDocsAdmonitions(
              normalizePandocFencedDivs(normalizeObsidianImages(normalizeImageAttributes(protectedMd)))
            )
          )
        )
      )
    )
  );

  return restoreCode(processed, codeBlocks);
}
