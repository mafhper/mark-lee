import { useEffect, useRef, type CSSProperties } from "react";
import { Heart, MapPin, ChevronLeft, ChevronRight, Ruler } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";
import MarkdownPreview from "../../../app/markdown/MarkdownPreview";
import { MOOD_EMOJI } from "../domain/moods";
import { READING_WIDTHS, readingWidthCss, useReadingWidth, type ReadingWidth } from "../presentation/readingWidth";

interface JournalPublicationViewProps {
  tConfig: ThemeConfig;
  entry: EntryRecord;
  coverUrl?: string | null;
  t?: Record<string, string>;
  language?: string;
  prevEntry?: EntryRecord | null;
  nextEntry?: EntryRecord | null;
  onNavigate?: (entry: EntryRecord) => void;
  /** Filter the entry list by this tag (and switch to the list view). */
  onOpenTag?: (tag: string) => void;
}

/**
 * The Memórias reading view — a calm, blog-like presentation of a single entry.
 * Colors are derived from the active app theme (not a publication preset) so the
 * text always has contrast against the editor background, and the Markdown body
 * flows directly into the page (no editor "surface" card). Prev/next links at the
 * end let you page through entries like browsing a blog.
 */
export function JournalPublicationView({
  tConfig, entry, coverUrl, t, language, prevEntry, nextEntry, onNavigate, onOpenTag,
}: JournalPublicationViewProps) {
  const fg = tConfig.editorFgHex; // guaranteed-readable on editorBgHex
  const [readingWidth, setReadingWidth] = useReadingWidth();
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

  // Map the app theme onto the Markdown preview's CSS variables so the prose
  // inherits readable, theme-correct colors instead of the light-mode defaults.
  const bodyVars: CSSProperties = {
    ["--ml-preview-bg" as string]: tConfig.editorBgHex,
    ["--ml-preview-text" as string]: fg,
    ["--ml-preview-accent" as string]: tConfig.accentHex,
    ["--ml-preview-muted" as string]: fg + "8C",
    ["--ml-preview-border" as string]: tConfig.uiBorderHex,
    ["--ml-preview-body-size" as string]: "1.075rem",
    ["--ml-preview-p-line-height" as string]: "1.8",
  } as CSSProperties;

  // Return to the top of the article when paging to another entry.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [entry.path]);

  const navCard = (target: EntryRecord, dir: "prev" | "next") => (
    <button type="button" onClick={() => onNavigate?.(target)}
      className={`group flex flex-col gap-1 rounded-xl border px-4 py-3 transition-colors hover:border-current ${dir === "next" ? "items-end text-right" : "items-start text-left"}`}
      style={{ borderColor: tConfig.uiBorderHex, color: fg }}>
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: fg + "70" }}>
        {dir === "prev" && <ChevronLeft size={12} />}
        {dir === "prev" ? (t?.["journal.previousEntry"] || "Previous") : (t?.["journal.nextEntry"] || "Next")}
        {dir === "next" && <ChevronRight size={12} />}
      </span>
      <span className="text-[13.5px] font-semibold leading-snug line-clamp-2" style={{ color: fg }}>
        {target.metadata.title || (t?.["journal.blankEntry"] || "Untitled")}
      </span>
    </button>
  );

  const widthLabels: Record<ReadingWidth, string> = {
    narrow: t?.["journal.widthNarrow"] || "Narrow",
    comfortable: t?.["journal.widthComfortable"] || "Comfortable",
    wide: t?.["journal.widthWide"] || "Wide",
    full: t?.["journal.widthFull"] || "Full",
  };

  return (
    <div className="relative h-full">
      {/* Discreet reading-width control, pinned to the top-right of the pane. */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 rounded-full border px-1 py-1 opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity"
        style={{ backgroundColor: tConfig.editorBgHex + "E6", borderColor: tConfig.uiBorderHex }}
        title={t?.["journal.readingWidth"] || "Reading width"}>
        <Ruler size={13} className="mx-1 shrink-0" style={{ color: fg + "70" }} />
        {READING_WIDTHS.map((w) => (
          <button key={w} type="button" onClick={() => setReadingWidth(w)}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors"
            aria-pressed={readingWidth === w}
            style={{
              backgroundColor: readingWidth === w ? tConfig.accentHex + "22" : "transparent",
              color: readingWidth === w ? tConfig.accentHex : fg + "85",
            }}>
            {widthLabels[w]}
          </button>
        ))}
      </div>
      <div ref={scrollRef} className="h-full overflow-y-auto" style={{ backgroundColor: tConfig.editorBgHex }}>
      <article className="mx-auto px-6 sm:px-10 pt-10 pb-16" style={{ maxWidth: readingWidthCss(readingWidth) }}>
        {coverUrl && (
          <div className="mb-9 overflow-hidden rounded-2xl" style={{ boxShadow: "0 14px 34px rgba(0,0,0,0.22)" }}>
            <img src={coverUrl} alt="" className="w-full object-cover" style={{ maxHeight: 400 }} />
          </div>
        )}

        <p className="text-[12px] font-medium uppercase tracking-[0.12em] mb-3" style={{ color: fg + "70" }}>
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
              <span className="inline-flex items-center gap-1 text-[12.5px]" style={{ color: fg + "9C" }}>
                <MapPin size={12} /> {loc}
              </span>
            )}
            {tags.map((tag) =>
              onOpenTag ? (
                <button key={tag} type="button" onClick={() => onOpenTag(tag)}
                  className="px-2.5 py-0.5 rounded-full text-[11.5px] font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}
                  aria-label={(t?.["journal.filterByTag"] || "Filter by tag {tag}").replace("{tag}", tag)}>
                  #{tag}
                </button>
              ) : (
                <span key={tag} className="px-2.5 py-0.5 rounded-full text-[11.5px] font-medium"
                  style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}>
                  #{tag}
                </span>
              ),
            )}
          </div>
        )}

        <div style={bodyVars}>
          <MarkdownPreview
            activePath={entry.path}
            content={entry.body}
            shellBackground="transparent"
            surfaceStyle={{ maxWidth: "none" }}
            bare
            onTagClick={onOpenTag}
          />
        </div>

        <div className="mt-12 pt-5 border-t flex items-center flex-wrap gap-x-5 gap-y-2 text-[12px]"
          style={{ borderColor: tConfig.uiBorderHex, color: fg + "70" }}>
          <span>{wordCount} {t?.["journal.words"] || "words"}</span>
          {loc && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {loc}</span>}
          {moodEmoji && <span className="inline-flex items-center gap-1">{moodEmoji} {t?.["mood." + mood] || mood}</span>}
        </div>

        {onNavigate && (prevEntry || nextEntry) && (
          <nav className="mt-6 grid grid-cols-2 gap-3">
            {prevEntry ? navCard(prevEntry, "prev") : <span />}
            {nextEntry ? navCard(nextEntry, "next") : <span />}
          </nav>
        )}
      </article>
      </div>
    </div>
  );
}
