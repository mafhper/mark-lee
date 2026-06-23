import { BookOpen, Heart, MapPin, SmilePlus } from "lucide-react";
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
}

export function JournalPublicationView({ tConfig, entry, coverUrl }: JournalPublicationViewProps) {
  return (
    <div className="h-full overflow-y-auto">
      <article className="mx-auto px-8 py-8" style={{ maxWidth: "65ch" }}>
        {coverUrl && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <img src={coverUrl} alt="" className="w-full h-48 object-cover" />
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: tConfig.fgHex }}>
          {entry.metadata.title || "Untitled"}
        </h1>

        <div className="flex items-center gap-3 text-xs mb-6" style={{ color: tConfig.fgHex + "60" }}>
          <span className="flex items-center gap-1">
            <BookOpen size={12} />
            {new Date(entry.metadata.date).toLocaleDateString()}
          </span>
          {entry.metadata.favorite && (
            <span className="flex items-center gap-1" style={{ color: "#ef4444" }}>
              <Heart size={12} fill="#ef4444" />
            </span>
          )}
        </div>

        {(entry.metadata.tags.length > 0 || entry.metadata.mood || entry.metadata.location) && (
          <div className="flex items-center gap-2 flex-wrap mb-6 pb-4 border-b text-xs" style={{ borderColor: tConfig.uiBorderHex }}>
            {entry.metadata.mood && MOOD_EMOJI[entry.metadata.mood] && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ backgroundColor: tConfig.accentHex + "12", color: tConfig.fgHex + "80" }}>
                <SmilePlus size={12} />
                {MOOD_EMOJI[entry.metadata.mood]}
              </span>
            )}
            {entry.metadata.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded" style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                {tag}
              </span>
            ))}
            {entry.metadata.location?.label && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ backgroundColor: tConfig.accentHex + "10", color: tConfig.fgHex + "70" }}>
                <MapPin size={11} />
                {entry.metadata.location.label}
              </span>
            )}
          </div>
        )}

        <div className="text-sm leading-relaxed" style={{ color: tConfig.fgHex + "DD" }}>
          <MarkdownPreview
            activePath={entry.path}
            content={entry.body}
            shellBackground={tConfig.editorBgHex}
          />
        </div>
      </article>
    </div>
  );
}
