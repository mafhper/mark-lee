import YAML from "yaml";
import type { JournalEntryMetadata } from "./journal-entry.types";

export function serializeJournalEntry(metadata: JournalEntryMetadata, body: string): string {
  // Build a plain object from metadata, excluding body
  const frontmatter: Record<string, unknown> = {};

  // Required fields
  frontmatter.schema = metadata.schema;
  frontmatter.schemaVersion = metadata.schemaVersion;
  frontmatter.id = metadata.id;
  frontmatter.date = metadata.date;
  frontmatter.title = metadata.title;

  // Optional fields — only include if present
  if (metadata.summary !== undefined) frontmatter.summary = metadata.summary;
  if (metadata.tags.length > 0) frontmatter.tags = metadata.tags;
  if (metadata.mood !== undefined) frontmatter.mood = metadata.mood;
  if (metadata.taskStatus !== undefined) frontmatter.taskStatus = metadata.taskStatus;
  if (metadata.trackers !== undefined && Object.keys(metadata.trackers).length > 0) {
    frontmatter.trackers = metadata.trackers;
  }
  if (metadata.location) {
    const loc: Record<string, unknown> = { label: metadata.location.label };
    if (metadata.location.latitude !== undefined) loc.latitude = metadata.location.latitude;
    if (metadata.location.longitude !== undefined) loc.longitude = metadata.location.longitude;
    if (metadata.location.source) loc.source = metadata.location.source;
    if (metadata.location.city) loc.city = metadata.location.city;
    if (metadata.location.state) loc.state = metadata.location.state;
    if (metadata.location.country) loc.country = metadata.location.country;
    if (metadata.location.attraction) loc.attraction = metadata.location.attraction;
    frontmatter.location = loc;
  }
  if (metadata.fields && Object.keys(metadata.fields).length > 0) {
    const fields: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(metadata.fields)) {
      if (typeof value === "string" || typeof value === "number" || value === null) {
        fields[key] = value;
      }
    }
    if (Object.keys(fields).length > 0) frontmatter.fields = fields;
  }
  if (metadata.images && metadata.images.length > 0) {
    frontmatter.images = metadata.images
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((image, order) => {
        const item: Record<string, unknown> = {
          id: image.id,
          path: image.path,
          order,
        };
        if (image.alt) item.alt = image.alt;
        if (image.caption) item.caption = image.caption;
        return item;
      });
  }
  if (metadata.cover !== undefined) frontmatter.cover = metadata.cover;
  if (metadata.favorite) frontmatter.favorite = true;
  if (metadata.attachments && metadata.attachments.length > 0) {
    frontmatter.attachments = metadata.attachments;
  }

  frontmatter.createdAt = metadata.createdAt;
  frontmatter.updatedAt = metadata.updatedAt;

  // Merge back unknown fields preserved from the original file
  if (metadata.extraFrontmatter) {
    for (const key of Object.keys(metadata.extraFrontmatter)) {
      if (!(key in frontmatter)) frontmatter[key] = metadata.extraFrontmatter[key];
    }
  }

  const yamlStr = YAML.stringify(frontmatter, { lineWidth: 0 });
  return `---\n${yamlStr}---\n\n${body}`;
}
