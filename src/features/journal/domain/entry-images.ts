import type { EntryRecord } from "./entry-service";
import { resolveEntryAssetPath, safeRelativeAssetPath } from "./export-paths.ts";

export type EntryImageKind = "cover" | "header" | "inline";

export interface EntryImageRef {
  id: string;
  entry: EntryRecord;
  ref: string;
  src: string;
  kind: EntryImageKind;
  occurrenceIndex: number;
  alt?: string;
  caption?: string;
  order: number;
}

export interface MarkdownImageRef {
  ref: string;
  alt: string;
  occurrenceIndex: number;
}

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((.+?)\)/g;

export function collectMarkdownImageRefs(body: string): MarkdownImageRef[] {
  const refs: MarkdownImageRef[] = [];
  let match: RegExpExecArray | null;
  let occurrenceIndex = 0;
  while ((match = MARKDOWN_IMAGE_RE.exec(body)) !== null) {
    refs.push({ alt: match[1], ref: match[2], occurrenceIndex });
    occurrenceIndex++;
  }
  return refs;
}

export function replaceInlineImageRef(body: string, occurrenceIndex: number, nextRef: string): string {
  let index = 0;
  return body.replace(MARKDOWN_IMAGE_RE, (match, alt, ref) => {
    if (index++ !== occurrenceIndex) return match;
    return `![${alt}](${nextRef || ref})`;
  });
}

export function collectEntryImageRefs(entry: EntryRecord, liveBody = entry.body): EntryImageRef[] {
  const refs: EntryImageRef[] = [];
  const seen = new Set<string>();

  const add = (
    ref: string | undefined,
    kind: EntryImageKind,
    id: string,
    order: number,
    occurrenceIndex: number,
    alt?: string,
    caption?: string,
  ) => {
    if (!ref || seen.has(`${kind}:${ref}:${occurrenceIndex}`)) return;
    const src = resolveEntryAssetPath(entry.path, ref);
    if (!src) return;
    seen.add(`${kind}:${ref}:${occurrenceIndex}`);
    refs.push({ id, entry, ref, src, kind, occurrenceIndex, alt, caption, order });
  };

  add(entry.metadata.cover, "cover", `${entry.metadata.id}:cover`, 0, -1);

  const headerImages = (entry.metadata.images ?? []).slice().sort((a, b) => a.order - b.order);
  headerImages.forEach((image, index) => {
    add(
      image.path,
      "header",
      `${entry.metadata.id}:header:${image.id || index}`,
      100 + index,
      index,
      image.alt,
      image.caption,
    );
  });

  collectMarkdownImageRefs(liveBody).forEach((image) => {
    add(
      image.ref,
      "inline",
      `${entry.metadata.id}:inline:${image.occurrenceIndex}`,
      1000 + image.occurrenceIndex,
      image.occurrenceIndex,
      image.alt,
    );
  });

  return refs.sort((a, b) => a.order - b.order);
}

export function collectEntryAssetRefs(entry: EntryRecord, liveBody = entry.body): string[] {
  const refs = [
    entry.metadata.cover,
    ...(entry.metadata.images ?? []).slice().sort((a, b) => a.order - b.order).map((image) => image.path),
    ...collectMarkdownImageRefs(liveBody).map((image) => image.ref),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    if (!ref) continue;
    const safe = safeRelativeAssetPath(ref);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    out.push(safe);
  }
  return out;
}

export function firstEntryImageRef(entry: EntryRecord): string | null {
  const first = collectEntryImageRefs(entry)[0];
  return first?.ref ?? null;
}

export function firstEntryImagePath(entry: EntryRecord): string | null {
  const first = collectEntryImageRefs(entry)[0];
  return first?.src ?? null;
}

export function findFirstNotebookImage(entries: EntryRecord[]): { entry: EntryRecord; ref: string; path: string } | null {
  for (const entry of entries) {
    const ref = firstEntryImageRef(entry);
    const path = firstEntryImagePath(entry);
    if (ref && path) return { entry, ref, path };
  }
  return null;
}
