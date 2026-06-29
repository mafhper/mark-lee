// Single source of truth for journal moods. Previously the same emoji map was
// copy-pasted into JournalAtlasMap, JournalPublicationView, JournalListView and
// JournalEntryPanel — four copies that had to be edited together. Import from
// here instead so a new mood (or a changed glyph) only has to be added once.

export const MOOD_KEYS = [
  "great",
  "good",
  "neutral",
  "sad",
  "angry",
  "anxious",
  "tired",
  "loved",
  "thankful",
  "creative",
  "sick",
  "excited",
] as const;

export type MoodKey = (typeof MOOD_KEYS)[number];

export const MOOD_EMOJI: Record<string, string> = {
  great: "\u{1F60A}",
  good: "\u{1F642}",
  neutral: "\u{1F610}",
  sad: "\u{1F622}",
  angry: "\u{1F624}",
  anxious: "\u{1F630}",
  tired: "\u{1F634}",
  loved: "\u{1F970}",
  thankful: "\u{1F64F}",
  creative: "\u{2728}",
  sick: "\u{1F912}",
  excited: "\u{1F929}",
};

/** Ordered [key, emoji] pairs for the mood picker in the entry panel. */
export const MOODS: { key: MoodKey; emoji: string }[] = MOOD_KEYS.map((key) => ({
  key,
  emoji: MOOD_EMOJI[key],
}));

/**
 * Font stack that forces a colored-emoji font when an emoji is drawn inside an
 * element we style ourselves (e.g. Leaflet map markers). Without this the glyph
 * falls back to the platform UI font, which on WebKitGTK (Linux) renders as a
 * monochrome "tofu" box. Append after any text font.
 */
export const EMOJI_FONT_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
