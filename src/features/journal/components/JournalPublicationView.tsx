import { useEffect, useRef, type CSSProperties } from "react";
import { Heart, MapPin, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { EntryRecord } from "../domain/entry-service";
import type { BlogViewConfig } from "../domain/journal.types";
import MarkdownPreview from "../../../app/markdown/MarkdownPreview";
import { MOOD_EMOJI } from "../domain/moods";

interface JournalPublicationViewProps {
  tConfig: ThemeConfig;
  entry: EntryRecord;
  coverUrl?: string | null;
  blogView?: BlogViewConfig | null;
  blogLogoUrl?: string | null;
  journalName?: string;
  t?: Record<string, string>;
  language?: string;
  prevEntry?: EntryRecord | null;
  nextEntry?: EntryRecord | null;
  onNavigate?: (entry: EntryRecord) => void;
  onConfigureBlog?: () => void;
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
  tConfig, entry, coverUrl, blogView, blogLogoUrl, journalName, t, language, prevEntry, nextEntry, onNavigate, onConfigureBlog, onOpenTag,
}: JournalPublicationViewProps) {
  const fg = tConfig.editorFgHex; // guaranteed-readable on editorBgHex
  const showMeta = blogView?.showMeta !== false;
  const blogTitle = blogView?.title || journalName || t?.["journal.mode"] || "Memórias";
  const blogTheme = blogView?.theme ?? "clean";
  // Each theme gets a meaningfully distinct visual treatment:
  // clean  = pure editor background, no decoration
  // paper  = warm off-white tint with a subtle vignette and page shadow
  // magazine = bold accent header band + wider reading column
  // notebook = ruled lines + left red margin line, slightly different bg tint
  const themeBg =
    blogTheme === "paper"
      ? `radial-gradient(ellipse 120% 60% at 50% 0%, ${tConfig.accentHex}18 0%, transparent 55%),
         radial-gradient(ellipse 80% 40% at 50% 100%, ${tConfig.fgHex}0A 0%, transparent 60%)`
      : blogTheme === "magazine"
      ? `linear-gradient(180deg, ${tConfig.accentHex}22 0px, ${tConfig.accentHex}08 180px, transparent 320px)`
      : blogTheme === "notebook"
      ? `repeating-linear-gradient(0deg, transparent 0px, transparent 31px, ${tConfig.uiBorderHex}60 31px, ${tConfig.uiBorderHex}60 32px),
         linear-gradient(90deg, transparent 48px, #e0484830 49px, #e0484830 50px, transparent 50px)`
      : "none";
  const articleMaxWidth = blogTheme === "magazine" ? "min(100%, 92ch)" : "min(100%, 74ch)";
  const date = new Date(entry.metadata.date);
  const dateLabel = date.toLocaleDateString(language || undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const wordCount = entry.body.trim() ? entry.body.trim().split(/\s+/).length : 0;
  const mood = entry.metadata.mood;
  const moodEmoji = mood ? MOOD_EMOJI[mood] : undefined;
  const loc = entry.metadata.location?.label;
  const tags = entry.metadata.tags ?? [];
  const hasMeta = showMeta && !!(mood || loc || entry.metadata.favorite || tags.length > 0);

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
    ["--ml-preview-h1-tracking" as string]: "0",
    ["--ml-preview-h2-tracking" as string]: "0",
    ["--ml-preview-h3-tracking" as string]: "0",
    ["--ml-preview-image-radius" as string]: blogTheme === "magazine" ? "4px" : blogTheme === "paper" ? "10px" : "14px",
    ["--ml-preview-quote-bg" as string]: blogTheme === "paper" ? tConfig.fgHex + "08" : "transparent",
    ["--ml-preview-rule-thickness" as string]: blogTheme === "magazine" ? "2px" : "1px",
  } as CSSProperties;

  // Return to the top of the article when paging to another entry.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [entry.path]);

  // Blog-style pager: newer entries on the left (←), older on the right (→).
  const navCard = (target: EntryRecord, side: "left" | "right", label: string) => (
    <button type="button" onClick={() => onNavigate?.(target)}
      className={`group flex flex-col gap-1 rounded-xl border px-4 py-3 transition-colors hover:border-current ${side === "right" ? "items-end text-right" : "items-start text-left"}`}
      style={{ borderColor: tConfig.uiBorderHex, color: fg }}>
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: fg + "70" }}>
        {side === "left" && <ChevronLeft size={12} />}
        {label}
        {side === "right" && <ChevronRight size={12} />}
      </span>
      <span className="text-[13.5px] font-semibold leading-snug line-clamp-2" style={{ color: fg }}>
        {target.metadata.title || (t?.["journal.blankEntry"] || "Untitled")}
      </span>
    </button>
  );

  return (
    <div className="relative h-full min-w-0 overflow-hidden">
      <div ref={scrollRef} className="h-full min-w-0 overflow-y-auto overflow-x-hidden"
        style={{ background: themeBg !== "none" ? `${themeBg}, ${tConfig.editorBgHex}` : tConfig.editorBgHex }}>
      <header className="border-b"
        style={{
          borderColor: tConfig.uiBorderHex,
          backgroundColor:
            blogTheme === "notebook" ? tConfig.uiHex + "D0"
            : blogTheme === "magazine" ? tConfig.accentHex + "18"
            : blogTheme === "paper" ? tConfig.editorBgHex + "E8"
            : "transparent",
          borderBottom: blogTheme === "magazine" ? `3px solid ${tConfig.accentHex}` : undefined,
        }}>
        <div className="mx-auto box-border flex min-h-[72px] w-full max-w-[1080px] items-center gap-3 px-5 py-3"
          style={{ color: fg }}>
          {blogView?.showLogo !== false && (blogLogoUrl || blogView?.logo) && (
            <div className="h-10 w-10 overflow-hidden rounded-lg border flex items-center justify-center shrink-0"
              style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "12" }}>
              {blogLogoUrl ? <img src={blogLogoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-semibold">{blogTitle.charAt(0)}</span>}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: fg }}>{blogTitle}</p>
            {blogView?.subtitle && <p className="truncate text-xs" style={{ color: fg + "70" }}>{blogView.subtitle}</p>}
          </div>
          {blogView?.menu?.length ? (
            <nav className="ml-auto hidden min-w-0 items-center gap-1 sm:flex">
              {blogView.menu.map((item) => (
                <a key={`${item.label}-${item.href}`} href={item.href}
                  className="rounded-md px-2 py-1 text-xs font-medium hover:opacity-75"
                  style={{ color: fg + "88" }}>
                  {item.label}
                </a>
              ))}
            </nav>
          ) : <span className="ml-auto" />}
          {onConfigureBlog && (
            <button type="button" onClick={onConfigureBlog}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:opacity-75"
              style={{ color: fg + "75", borderColor: tConfig.uiBorderHex }}
              title={t?.["blog.settings"] || "Blog settings"}>
              <Settings2 size={14} />
            </button>
          )}
        </div>
      </header>
      <article className="mx-auto box-border min-w-0 w-full pt-10 pb-16"
        style={{
          maxWidth: articleMaxWidth,
          paddingInline: "clamp(16px, 4vw, 52px)",
        }}>
        {coverUrl && (
          <div className="mb-9 overflow-hidden rounded-xl" style={{ boxShadow: "0 14px 34px rgba(0,0,0,0.22)" }}>
            <img src={coverUrl} alt="" className="w-full object-cover" style={{ maxHeight: "min(48vh, 420px)" }} />
          </div>
        )}

        {showMeta && (
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] mb-3" style={{ color: fg + "70" }}>
            {dateLabel}
          </p>
        )}

        <h1 className="text-[2.35rem] font-bold leading-[1.12] tracking-normal mb-5" style={{ color: fg, overflowWrap: "anywhere" }}>
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

        <div className="min-w-0 overflow-x-hidden" style={bodyVars}>
          <MarkdownPreview
            activePath={entry.path}
            content={entry.body}
            shellBackground="transparent"
            surfaceStyle={{ maxWidth: "none", width: "100%", minWidth: 0, overflowX: "hidden" }}
            bare
            onTagClick={onOpenTag}
          />
        </div>

        {showMeta && (
          <div className="mt-12 pt-5 border-t flex items-center flex-wrap gap-x-5 gap-y-2 text-[12px]"
            style={{ borderColor: tConfig.uiBorderHex, color: fg + "70" }}>
            <span>{wordCount} {t?.["journal.words"] || "words"}</span>
            {loc && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {loc}</span>}
            {moodEmoji && <span className="inline-flex items-center gap-1">{moodEmoji} {t?.["mood." + mood] || mood}</span>}
          </div>
        )}

        {onNavigate && (prevEntry || nextEntry) && (
          <nav className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* nextEntry is the chronologically newer one → left; prevEntry is older → right */}
            {nextEntry ? navCard(nextEntry, "left", t?.["journal.newerEntry"] || "Newer") : <span />}
            {prevEntry ? navCard(prevEntry, "right", t?.["journal.olderEntry"] || "Older") : <span />}
          </nav>
        )}
      </article>
      </div>
    </div>
  );
}
