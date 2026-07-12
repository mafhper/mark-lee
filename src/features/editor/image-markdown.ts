function encodeMarkdownPath(path: string): string {
  return encodeURI(path)
    .replace(/#/g, "%23")
    .replace(/\?/g, "%3F")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

/**
 * Turn a local/imported image path into a Markdown-safe destination.
 * Relative paths stay explicitly relative and reserved Markdown characters are
 * percent-encoded so React Markdown parses the result as an image, not text.
 */
export function normalizeMarkdownImagePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, "/");
  if (!normalized) throw new Error("Image path is empty");

  const explicit = normalized.startsWith("./")
    || normalized.startsWith("../")
    || normalized.startsWith("/")
    || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)
    ? normalized
    : `./${normalized}`;

  return encodeMarkdownPath(explicit);
}

export function buildMarkdownImageSyntax(path: string, alt = "Image"): string {
  const safeAlt = alt.replace(/\]/g, "\\]");
  return `![${safeAlt}](${normalizeMarkdownImagePath(path)})`;
}
