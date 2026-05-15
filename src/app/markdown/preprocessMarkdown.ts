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

function normalizeInlineExtensions(markdown: string) {
  return markdown
    .replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
    .replace(/\+\+([^+\n]+)\+\+/g, "<ins>$1</ins>")
    .replace(/(?<!-)--([^- \n][^-\n]*?)--(?!-)/g, "<del>$1</del>")
    .replace(/(?<!~)~([^~\n]+)~(?!~)/g, "<sub>$1</sub>")
    .replace(/\^([^^\n]+)\^/g, "<sup>$1</sup>");
}

export function preprocessMarkdown(content: string) {
  return normalizeInlineExtensions(normalizeObsidianImages(normalizeImageAttributes(content)));
}
