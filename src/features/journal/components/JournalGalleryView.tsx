import { useEffect, useMemo, useState } from "react";
import { Archive, Check, Copy, ExternalLink, FileText, Heart, HeartOff, Image as ImageIcon, ImagePlus, Trash2, X } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { saveEntry } from "../domain/entry-service";
import { atomicWriteText, copyImageToDocumentDir, loadImage, openFileDialog, writeBinaryFile } from "../../../services/filesystem";
import { resolveEntryAssetPath } from "../domain/export-paths";
import { useContextMenu, type ContextMenuEntry } from "../../../app/components/context-menu";
import { JournalEmptyState } from "./JournalEmptyState";
import { JournalLightbox } from "./JournalLightbox";

type GallerySort = "date-desc" | "date-asc" | "title" | "file";
type GalleryGroup = "publication" | "month" | "place" | "tag";

interface JournalGalleryViewProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entries: EntryRecord[];
  selectedEntryId?: string | null;
  onSelectEntry: (entry: EntryRecord) => void;
  onEntryUpdated?: (entry: EntryRecord) => void;
  onToggleFavorite?: (entry: EntryRecord) => void;
  onDuplicateEntry?: (entry: EntryRecord) => void;
  onDeleteEntry?: (entry: EntryRecord) => void;
  onOpenInEditor?: (path: string) => void;
}

interface GalleryItem {
  id: string;
  entry: EntryRecord;
  src: string;
  ref: string;
  kind: "cover" | "inline";
  occurrenceIndex: number;
}

function entryDir(path: string) {
  return path.substring(0, path.lastIndexOf("/"));
}

function basename(path: string) {
  return path.replace(/\\/g, "/").split("/").pop() || "image";
}

function stem(path: string) {
  return basename(path).replace(/\.[^.]+$/, "") || "image";
}

function replaceInlineImageRef(body: string, occurrenceIndex: number, nextRef: string) {
  const re = /!\[.*?\]\((.+?)\)/g;
  let index = 0;
  return body.replace(re, (match, ref) => {
    if (index++ !== occurrenceIndex) return match;
    return match.replace(ref, nextRef);
  });
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

async function imageToWebpBytes(dataUrl: string, maxSize: number, quality: number) {
  const img = await dataUrlToImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("WebP conversion failed")), "image/webp", quality);
  });
  return { bytes: await blobToBytes(blob), width, height };
}

function GalleryThumb({
  item, tConfig, selected, activeEntry, onSelect, onOpenLightbox, onReplace, onContextMenu,
}: {
  item: GalleryItem;
  tConfig: ThemeConfig;
  selected: boolean;
  activeEntry: boolean;
  onSelect: () => void;
  onOpenLightbox: () => void;
  onReplace: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setUrl(null);
    loadImage(item.src).then((next) => { if (active) setUrl(next); }).catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [item.src]);

  return (
    <div onContextMenu={onContextMenu}
      className="group relative flex w-full flex-col items-start gap-1 overflow-hidden rounded-lg border text-left transition-transform hover:scale-[1.01]"
      style={{
        borderColor: selected ? tConfig.accentHex : activeEntry ? tConfig.accentHex + "80" : tConfig.uiBorderHex,
        boxShadow: selected ? `0 0 0 2px ${tConfig.accentHex}33` : "none",
      }}>
      <button type="button" onClick={onOpenLightbox} className="flex aspect-video w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: tConfig.accentHex + "10" }}>
        {url ? <img src={url} alt="" className="h-full w-full cursor-pointer object-cover" /> : <ImageIcon size={24} style={{ color: tConfig.fgHex + "30" }} />}
      </button>
      <button type="button" onClick={onReplace}
        className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full border backdrop-blur group-hover:flex"
        style={{ backgroundColor: tConfig.bgHex + "D8", borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        title="Substituir imagem">
        <ImagePlus size={14} />
      </button>
      {activeEntry && (
        <div className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: selected ? tConfig.accentHex : tConfig.bgHex + "D8", color: selected ? "#fff" : tConfig.accentHex }}>
          {selected ? <Check size={11} className="inline" /> : null} {item.kind === "cover" ? "cover" : "post"}
        </div>
      )}
      <button type="button" onClick={onSelect} className="min-w-0 w-full px-2 pb-2 text-left hover:opacity-75">
        <p className="truncate text-xs font-medium" style={{ color: tConfig.fgHex }}>{item.entry.metadata.title || "Untitled"}</p>
        <p className="truncate text-[10px]" style={{ color: tConfig.fgHex + "50" }}>{basename(item.ref)}</p>
      </button>
    </div>
  );
}

export function JournalGalleryView({
  t, tConfig, journal, entries, selectedEntryId, onSelectEntry, onEntryUpdated, onToggleFavorite, onDuplicateEntry, onDeleteEntry, onOpenInEditor,
}: JournalGalleryViewProps) {
  const { openContextMenu } = useContextMenu();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<GallerySort>("date-desc");
  const [groupBy, setGroupBy] = useState<GalleryGroup>("publication");
  const [showConsolidate, setShowConsolidate] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidated, setConsolidated] = useState(0);

  const items = useMemo(() => {
    const result: GalleryItem[] = [];
    for (const entry of entries) {
      let occurrenceIndex = 0;
      if (entry.metadata.cover) {
        const src = resolveEntryAssetPath(entry.path, entry.metadata.cover);
        if (src) result.push({ id: `${entry.metadata.id}:cover`, entry, src, ref: entry.metadata.cover, kind: "cover", occurrenceIndex: -1 });
      }
      const re = /!\[.*?\]\((.+?)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(entry.body)) !== null) {
        const src = resolveEntryAssetPath(entry.path, m[1]);
        if (src) result.push({ id: `${entry.metadata.id}:inline:${occurrenceIndex}`, entry, src, ref: m[1], kind: "inline", occurrenceIndex });
        occurrenceIndex++;
      }
    }
    return result.sort((a, b) => {
      if (sortBy === "title") return (a.entry.metadata.title || "").localeCompare(b.entry.metadata.title || "");
      if (sortBy === "file") return basename(a.ref).localeCompare(basename(b.ref));
      const ad = new Date(a.entry.metadata.date).getTime();
      const bd = new Date(b.entry.metadata.date).getTime();
      return sortBy === "date-asc" ? ad - bd : bd - ad;
    });
  }, [entries, sortBy]);

  const grouped = useMemo(() => {
    const groups = new Map<string, GalleryItem[]>();
    for (const item of items) {
      const d = new Date(item.entry.metadata.date);
      const key =
        groupBy === "month"
          ? d.toLocaleDateString(undefined, { year: "numeric", month: "long" })
          : groupBy === "place"
            ? item.entry.metadata.location?.label || t["journal.noLocation"] || "No location"
            : groupBy === "tag"
              ? item.entry.metadata.tags[0] ? `#${item.entry.metadata.tags[0]}` : t["journal.noTags"] || "No tags"
              : item.entry.metadata.title || t["journal.blankEntry"] || "Untitled";
      const bucket = groups.get(key) ?? [];
      bucket.push(item);
      groups.set(key, bucket);
    }
    return Array.from(groups.entries());
  }, [groupBy, items, t]);

  const handleEntryContextMenu = (event: React.MouseEvent, entry: EntryRecord) => {
    event.preventDefault();
    const contextItems: ContextMenuEntry[] = [
      { type: "item", id: "open", label: t["journal.open"] || "Open", icon: <FileText size={14} />, onSelect: () => onSelectEntry(entry) },
    ];
    if (onToggleFavorite) {
      contextItems.push({
        type: "item", id: "favorite",
        label: entry.metadata.favorite ? (t["journal.removeFavorite"] || "Remove from favorites") : (t["journal.addFavorite"] || "Add to favorites"),
        icon: entry.metadata.favorite ? <HeartOff size={14} /> : <Heart size={14} />,
        onSelect: () => onToggleFavorite(entry),
      });
    }
    if (onDuplicateEntry) contextItems.push({ type: "item", id: "duplicate", label: t["journal.duplicate"] || "Duplicate", icon: <Copy size={14} />, onSelect: () => onDuplicateEntry(entry) });
    if (onOpenInEditor) contextItems.push({ type: "item", id: "editor", label: t["journal.editor"] || "Open in Editor", icon: <ExternalLink size={14} />, onSelect: () => onOpenInEditor(entry.path) });
    if (onDeleteEntry) {
      contextItems.push({ type: "separator", id: "sep" });
      contextItems.push({ type: "item", id: "delete", label: t["journal.delete"] || "Delete", icon: <Trash2 size={14} />, danger: true, onSelect: () => onDeleteEntry(entry) });
    }
    openContextMenu({ anchor: { type: "point", x: event.clientX, y: event.clientY }, items: contextItems });
  };

  const replaceImage = async (item: GalleryItem) => {
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }],
    });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    const relative = await copyImageToDocumentDir(path, item.entry.path);
    const metadata = item.kind === "cover" ? { ...item.entry.metadata, cover: relative } : item.entry.metadata;
    const body = item.kind === "inline" ? replaceInlineImageRef(item.entry.body, item.occurrenceIndex, relative) : item.entry.body;
    await saveEntry(item.entry.path, metadata, body, true);
    const updated = { ...item.entry, metadata, body, wordCount: body.trim() ? body.trim().split(/\s+/).length : 0 };
    onEntryUpdated?.(updated);
    setSelectedImageId(item.kind === "cover" ? `${updated.metadata.id}:cover` : `${updated.metadata.id}:inline:${item.occurrenceIndex}`);
  };

  const consolidateVisible = async () => {
    if (!journal) return;
    setConsolidating(true);
    setConsolidated(0);
    const replacements = new Map<string, string>();
    const updatedEntries = new Map<string, EntryRecord>();
    const history: Array<{ entryId: string; from: string; to: string; width: number; height: number }> = [];
    const timestamp = Date.now();

    for (const [index, item] of items.entries()) {
      const ext = basename(item.ref).split(".").pop()?.toLowerCase() || "";
      if (ext === "svg" || ext === "gif") continue;
      try {
        const cacheKey = `${item.entry.path}:${item.ref}`;
        let nextRef = replacements.get(cacheKey);
        let dimensions = { width: 0, height: 0 };
        if (!nextRef) {
          const dataUrl = await loadImage(item.src);
          const converted = await imageToWebpBytes(dataUrl, 2048, 0.82);
          dimensions = { width: converted.width, height: converted.height };
          nextRef = `${stem(item.ref)}-optimized-${timestamp}-${index}.webp`;
          await writeBinaryFile(`${entryDir(item.entry.path)}/${nextRef}`, converted.bytes);
          replacements.set(cacheKey, nextRef);
        }
        const current = updatedEntries.get(item.entry.metadata.id) ?? item.entry;
        const metadata = item.kind === "cover" ? { ...current.metadata, cover: nextRef } : current.metadata;
        const body = item.kind === "inline" ? replaceInlineImageRef(current.body, item.occurrenceIndex, nextRef) : current.body;
        const updated = { ...current, metadata, body, wordCount: body.trim() ? body.trim().split(/\s+/).length : 0 };
        updatedEntries.set(item.entry.metadata.id, updated);
        history.push({ entryId: item.entry.metadata.id, from: item.ref, to: nextRef, ...dimensions });
        setConsolidated((count) => count + 1);
      } catch {
        /* Skip files that cannot be decoded or written; consolidation is best-effort and non-destructive. */
      }
    }

    for (const entry of updatedEntries.values()) {
      await saveEntry(entry.path, entry.metadata, entry.body, true);
      onEntryUpdated?.(entry);
    }
    if (history.length > 0) {
      await atomicWriteText(`${journal.rootPath}/.marklee/image-consolidation-${timestamp}.json`, JSON.stringify({ createdAt: new Date().toISOString(), history }, null, 2));
    }
    setConsolidating(false);
    setShowConsolidate(false);
  };

  if (!journal) {
    return <JournalEmptyState icon={<ImageIcon size={36} />} title="Gallery" description="Select a journal to view photos." tConfig={tConfig} />;
  }

  if (items.length === 0) {
    return <JournalEmptyState icon={<ImageIcon size={36} />} title="Gallery" description="No photos found in this journal." tConfig={tConfig} />;
  }

  const selectedIndex = selectedImageId ? items.findIndex((item) => item.id === selectedImageId) : -1;
  const lightboxItem = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 border-b px-3 py-2"
        style={{ color: tConfig.fgHex + "70", borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.uiHex }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider">{items.length} photo{items.length !== 1 ? "s" : ""}</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as GallerySort)}
            className="rounded border bg-transparent px-2 py-1 text-[11px] outline-none" style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
            <option value="date-desc">Recentes</option>
            <option value="date-asc">Antigas</option>
            <option value="title">Título</option>
            <option value="file">Arquivo</option>
          </select>
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GalleryGroup)}
            className="rounded border bg-transparent px-2 py-1 text-[11px] outline-none" style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
            <option value="publication">Publicação</option>
            <option value="month">Mês</option>
            <option value="place">Lugar</option>
            <option value="tag">Tag</option>
          </select>
          <button type="button" onClick={() => setShowConsolidate(true)}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium"
            style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
            <Archive size={12} />Consolidar
          </button>
        </div>
      </div>

      <div className="space-y-4 p-3">
        {grouped.map(([group, groupItems]) => (
          <section key={group} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: tConfig.fgHex + "65" }}>{group}</h3>
              <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: tConfig.accentHex + "12", color: tConfig.accentHex }}>{groupItems.length}</span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {groupItems.map((item) => {
                const i = items.findIndex((candidate) => candidate.id === item.id);
                const selected = selectedImageId === item.id;
                const activeEntry = selectedEntryId === item.entry.metadata.id;
                return (
                  <GalleryThumb key={item.id} item={item} tConfig={tConfig}
                    selected={selected}
                    activeEntry={activeEntry}
                    onSelect={() => { setSelectedImageId(item.id); onSelectEntry(item.entry); }}
                    onOpenLightbox={() => { setSelectedImageId(item.id); onSelectEntry(item.entry); setLightboxIndex(i); }}
                    onReplace={() => replaceImage(item)}
                    onContextMenu={(event) => handleEntryContextMenu(event, item.entry)} />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {lightboxItem && (
        <JournalLightbox
          src={lightboxItem.src}
          index={lightboxIndex ?? selectedIndex}
          total={items.length}
          t={t}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex !== null && lightboxIndex > 0 ? () => {
            const next = lightboxIndex - 1;
            setLightboxIndex(next);
            setSelectedImageId(items[next].id);
            onSelectEntry(items[next].entry);
          } : undefined}
          onNext={lightboxIndex !== null && lightboxIndex < items.length - 1 ? () => {
            const next = lightboxIndex + 1;
            setLightboxIndex(next);
            setSelectedImageId(items[next].id);
            onSelectEntry(items[next].entry);
          } : undefined}
        />
      )}

      {showConsolidate && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-[420px] max-w-[92vw] rounded-xl border p-5 shadow-2xl"
            style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Consolidar imagens</h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: tConfig.fgHex + "70" }}>
                  Cria cópias WebP em até 2048px com qualidade 0.82, atualiza as referências e preserva os arquivos originais.
                </p>
              </div>
              <button type="button" onClick={() => setShowConsolidate(false)} className="rounded p-1 hover:opacity-70"><X size={16} /></button>
            </div>
            <div className="mb-4 rounded-lg border p-3 text-xs" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "05" }}>
              {items.length} imagem(ns) visíveis. GIF e SVG serão ignorados para evitar perda de comportamento.
              {consolidating && <p className="mt-2">{consolidated} processada(s)…</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowConsolidate(false)} disabled={consolidating}
                className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "85" }}>
                Cancelar
              </button>
              <button type="button" onClick={consolidateVisible} disabled={consolidating}
                className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
                {consolidating ? "Consolidando…" : "Criar cópias WebP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
