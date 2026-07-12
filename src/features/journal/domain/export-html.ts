import type { EntryRecord } from "./entry-service";
import { safeRelativeAssetPath } from "./export-paths.ts";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function entryHeaderMediaHtml(entry: EntryRecord): string {
  const chunks: string[] = [];
  if (entry.metadata.cover && safeRelativeAssetPath(entry.metadata.cover)) {
    chunks.push(`<figure class="entry-cover"><img src="${escapeHtml(entry.metadata.cover)}" alt="" /></figure>`);
  }
  const images = (entry.metadata.images ?? []).slice().sort((a, b) => a.order - b.order);
  if (images.length > 0) {
    const figures = images
      .filter((image) => safeRelativeAssetPath(image.path))
      .map((image) => {
        const alt = escapeHtml(image.alt ?? "");
        const caption = image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : "";
        return `<figure><img src="${escapeHtml(image.path)}" alt="${alt}" />${caption}</figure>`;
      })
      .join("\n");
    if (figures) chunks.push(`<section class="entry-gallery">\n${figures}\n</section>`);
  }
  return chunks.join("\n");
}
