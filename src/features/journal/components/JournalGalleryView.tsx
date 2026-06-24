import { useState, useEffect, useMemo } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { loadImage } from "../../../services/filesystem";
import { resolveEntryAssetPath } from "../domain/export-paths";
import { JournalEmptyState } from "./JournalEmptyState";
import { JournalLightbox } from "./JournalLightbox";

interface JournalGalleryViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entries: EntryRecord[];
  onSelectEntry: (entry: EntryRecord) => void;
}

interface GalleryItem {
  entry: EntryRecord;
  src: string;
}

function GalleryThumb({ item, tConfig, onSelect, onOpenLightbox }: { item: GalleryItem; tConfig: ThemeConfig; onSelect: () => void; onOpenLightbox: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    loadImage(item.src).then(setUrl).catch(() => setUrl(null));
  }, [item.src]);
  return (
    <div className="flex flex-col items-start gap-1 rounded-lg overflow-hidden border text-left transition-transform hover:scale-[1.02] w-full"
      style={{ borderColor: tConfig.uiBorderHex }}>
      <button type="button" onClick={onOpenLightbox} className="w-full aspect-video overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: tConfig.accentHex + "10" }}>
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover cursor-pointer" />
        ) : (
          <ImageIcon size={24} style={{ color: tConfig.fgHex + "30" }} />
        )}
      </button>
      <button type="button" onClick={onSelect} className="px-2 pb-2 min-w-0 w-full text-left hover:opacity-70">
        <p className="text-xs font-medium truncate" style={{ color: tConfig.fgHex }}>
          {item.entry.metadata.title || "Untitled"}
        </p>
        <p className="text-[10px] truncate" style={{ color: tConfig.fgHex + "50" }}>
          {new Date(item.entry.metadata.date).toLocaleDateString()}
        </p>
      </button>
    </div>
  );
}

export function JournalGalleryView({ t, tConfig, journal, entries, onSelectEntry }: JournalGalleryViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const items = useMemo(() => {
    const result: GalleryItem[] = [];
    for (const entry of entries) {
      const re = /!\[.*?\]\((.+?)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(entry.body)) !== null) {
        // Constrain every gallery/lightbox source to the entry's own folder;
        // external/absolute/`..` refs resolve to null and are skipped.
        const src = resolveEntryAssetPath(entry.path, m[1]);
        if (src) result.push({ entry, src });
      }
      if (entry.metadata.cover) {
        const src = resolveEntryAssetPath(entry.path, entry.metadata.cover);
        if (src && !result.some((r) => r.entry.metadata.id === entry.metadata.id && r.src === src)) {
          result.push({ entry, src });
        }
      }
    }
    return result;
  }, [entries]);

  if (!journal) {
    return (
      <JournalEmptyState icon={<ImageIcon size={36} />} title="Gallery"
        description="Select a journal to view photos." tConfig={tConfig} />
    );
  }

  if (items.length === 0) {
    return (
      <JournalEmptyState icon={<ImageIcon size={36} />} title="Gallery"
        description="No photos found in this journal." tConfig={tConfig} />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b sticky top-0 z-10"
        style={{ color: tConfig.fgHex + "60", borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex }}>
        {items.length} photo{items.length !== 1 ? "s" : ""}
      </div>
      <div className="grid gap-3 p-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {items.map((item, i) => (
          <GalleryThumb key={`${item.entry.metadata.id}-${i}`} item={item} tConfig={tConfig}
            onSelect={() => onSelectEntry(item.entry)}
            onOpenLightbox={() => setLightboxIndex(i)} />
        ))}
      </div>

      {lightboxIndex !== null && (
        <JournalLightbox
          src={items[lightboxIndex].src}
          index={lightboxIndex}
          total={items.length}
          t={t}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={lightboxIndex < items.length - 1 ? () => setLightboxIndex(lightboxIndex + 1) : undefined}
        />
      )}
    </div>
  );
}
