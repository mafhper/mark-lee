const HAS_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Normalize an asset reference taken from entry Markdown into a safe relative path.
 *
 * Returns `null` for anything that could escape the entry directory (when reading
 * the source) or the export destination (when writing the copy): absolute paths,
 * Windows drive letters, UNC/protocol-relative paths, URL schemes, or `..`
 * segments. This is the single boundary check that prevents path traversal during
 * export — both the source read and the destination write are built only from the
 * returned value, never from the raw reference.
 */
export function safeRelativeAssetPath(ref: string): string | null {
  if (!ref) return null;
  let p = ref.trim();
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep raw value if it is not valid percent-encoding */
  }
  p = p.replace(/\\/g, "/");
  if (!p) return null;
  if (HAS_SCHEME_RE.test(p)) return null; // http:, data:, javascript:, etc.
  if (p.startsWith("//")) return null; // protocol-relative
  if (p.startsWith("/")) return null; // POSIX absolute
  if (/^[a-zA-Z]:/.test(p)) return null; // Windows drive letter

  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") return null; // any parent-directory escape is rejected
    out.push(seg);
  }
  if (out.length === 0) return null;
  return out.join("/");
}
