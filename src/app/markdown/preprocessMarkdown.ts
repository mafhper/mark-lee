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
        output.push("</div>");
        stack.pop();
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

    const [, , marker, rawKind, title] = match;
    const kind = rawKind.toUpperCase();
    const collapsible = marker === "???";
    output.push(`> [!${kind}]${collapsible ? " Collapsible" : ""}${title ? ` ${title}` : ""}`);

    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      if (!next.trim()) {
        output.push(">");
        index += 1;
        continue;
      }
      const content = next.match(/^(?: {4}|\t)(.*)$/);
      if (!content) break;
      output.push(`> ${content[1]}`);
      index += 1;
    }
  }

  return output.join("\n");
}

function normalizeMystDirectives(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let directive: string | null = null;

  for (const line of lines) {
    const open = line.match(/^:::\{([\w-]+)\}\s*$/);
    if (open) {
      directive = open[1].toUpperCase();
      output.push(`> [!${directive}]`);
      continue;
    }

    if (directive && line.match(/^:::\s*$/)) {
      output.push(">");
      directive = null;
      continue;
    }

    output.push(directive ? `> ${line}` : line);
  }

  return output.join("\n");
}

function normalizeTags(markdown: string) {
  return markdown.replace(/(^|\s)#([\p{L}\p{N}_/-]+)/gu, (_match, prefix: string, tag: string) => {
    return `${prefix}<span class="ml-preview-tag">#${escapeHtmlAttribute(tag)}</span>`;
  });
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
  return normalizeInlineExtensions(
    normalizeTags(
      normalizeCitations(
        normalizeWikilinks(
          normalizeMystDirectives(
            normalizeMkDocsAdmonitions(
              normalizePandocFencedDivs(normalizeObsidianImages(normalizeImageAttributes(content)))
            )
          )
        )
      )
    )
  );
}
