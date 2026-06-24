import type { CSSProperties } from "react";
import { Heart, MapPin } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";
import MarkdownPreview from "../../../app/markdown/MarkdownPreview";

const MOOD_EMOJI: Record<string, string> = {
  great: "\u{1F60A}", good: "\u{1F642}", neutral: "\u{1F610}",
  sad: "\u{1F622}", angry: "\u{1F624}", anxious: "\u{1F630}",
  tired: "\u{1F634}", loved: "\u{1F970}", thankful: "\u{1F64F}",
  creative: "\u{2728}", sick: "\u{1F912}", excited: "\u{1F929}",
};

interface JournalPublicationViewProps {
  tConfig: ThemeConfig;
  entry: EntryRecord;
  coverUrl?: string | null;
  t?: Record<string, string>;
  language?: string;
}

/**
 * The Memórias reading view — a calm, blog-like presentation of a single entry.
 * Generous column, hero cover, a clear title, and a quiet metadata line, with the
 * Markdown body flowing directly into the page (no editor "surface" card).
 */
export function JournalPublicationView({ tConfig, entry, coverUrl, t, language }: JournalPublicationViewProps) {
  const fg = tConfig.fgHex;
  const date = new Date(entry.metadata.date);
  const dateLabel = date.toLocaleDateString(language || undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const wordCount = entry.body.trim() ? entry.body.trim().split(/\s+/).length : 0;
  const mood = entry.metadata.mood;
  const moodEmoji = mood ? MOOD_EMOJI[mood] : undefined;
  const loc = entry.metadata.location?.label;
  const tags = entry.metadata.tags ?? [];
  const hasMeta = !!(mood || loc || entry.metadata.favorite || tags.length > 0);

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: tConfig.editorBgHex }}>
      <article className="mx-auto px-6 sm:px-10 pt-10 pb-16" style={{ maxWidth: "44rem" }}>
        {coverUrl && (
          <div className="mb-9 overflow-hidden rounded-2xl" style={{ boxShadow: "0 14px 34px rgba(0,0,0,0.14)" }}>
            <img src={coverUrl} alt="" className="w-full object-cover" style={{ maxHeight: 400 }} />
          </div>
        )}

        <p className="text-[12px] font-medium uppercase tracking-[0.12em] mb-3" style={{ color: fg + "55" }}>
          {dateLabel}
        </p>

        <h1 className="text-[2.4rem] font-bold leading-[1.12] tracking-tight mb-5" style={{ color: fg }}>
          {entry.metadata.title || (t?.["journal.blankEntry"] || "Untitled")}
        </h1>

        {hasMeta && (
          <div className="flex items-center gap-2.5 flex-wrap mb-9">
            {entry.metadata.favorite && (
              <Heart size={15} fill="#ef4444" style={{ color: "#ef4444" }} />
            )}
            {moodEmoji && (
              <span className="text-[16px] leading-none" title={t?.["mood." + mood] || mood}>{moodEmoji}</span>
            )}
            {loc && (
              <span className="inline-flex items-center gap-1 text-[12.5px]" style={{ color: fg + "78" }}>
                <MapPin size={12} /> {loc}
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 rounded-full text-[11.5px] font-medium"
                style={{ backgroundColor: tConfig.accentHex + "16", color: tConfig.accentHex }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{
          ["--ml-preview-body-size" as string]: "1.075rem",
          ["--ml-preview-p-line-height" as string]: "1.8",
        } as CSSProperties}>
          <MarkdownPreview
            activePath={entry.path}
            content={entry.body}
            shellBackground="transparent"
            surfaceStyle={{ maxWidth: "none" }}
            bare
          />
        </div>

        <div className="mt-12 pt-5 border-t flex items-center flex-wrap gap-x-5 gap-y-2 text-[12px]"
          style={{ borderColor: tConfig.uiBorderHex, color: fg + "55" }}>
          <span>{wordCount} {t?.["journal.words"] || "words"}</span>
          {loc && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {loc}</span>}
          {moodEmoji && <span className="inline-flex items-center gap-1">{moodEmoji} {t?.["mood." + mood] || mood}</span>}
        </div>
      </article>
    </div>
  );
}
