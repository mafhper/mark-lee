import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, ExternalLink, Trash2, Heart, Plus, X, Copy, AlertTriangle, SmilePlus, Info, Image, Table } from "lucide-react";

const MOODS: { key: string; emoji: string }[] = [
  { key: "great", emoji: "\u{1F60A}" },
  { key: "good", emoji: "\u{1F642}" },
  { key: "neutral", emoji: "\u{1F610}" },
  { key: "sad", emoji: "\u{1F622}" },
  { key: "angry", emoji: "\u{1F624}" },
  { key: "anxious", emoji: "\u{1F630}" },
  { key: "tired", emoji: "\u{1F634}" },
  { key: "loved", emoji: "\u{1F970}" },
  { key: "thankful", emoji: "\u{1F64F}" },
  { key: "creative", emoji: "\u{2728}" },
  { key: "sick", emoji: "\u{1F912}" },
  { key: "excited", emoji: "\u{1F929}" },
];
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord, ConflictError } from "../domain/entry-service";
import { saveEntry } from "../domain/entry-service";
import { openFileDialog, copyImageToDocumentDir, loadImage } from "../../../services/filesystem";
import { TrackerManagerDialog } from "./TrackerManagerDialog";
import { TrackerStatsPanel } from "./TrackerStatsPanel";
import { getTrackerDefinitions } from "../domain/tracker-service";
import type { TrackerDefinition } from "../domain/journal.types";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalEntryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entry: EntryRecord | null;
  onEntryUpdated: (entry: EntryRecord) => void;
  onOpenInEditor?: (path: string) => void;
  onDeleteEntry?: (entry: EntryRecord) => void;
  onDuplicateEntry?: (entry: EntryRecord) => void;
  onReloadEntry?: () => void;
}

export function JournalEntryPanel({ t, tConfig, journal, entry, onEntryUpdated, onOpenInEditor, onDeleteEntry, onDuplicateEntry, onReloadEntry }: JournalEntryPanelProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [mood, setMood] = useState("");
  const [trackerValues, setTrackerValues] = useState<Record<string, string | number | boolean | null>>({});
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showTrackerManager, setShowTrackerManager] = useState(false);
  const [showTrackerStats, setShowTrackerStats] = useState(false);
  const [trackerDefs, setTrackerDefs] = useState<TrackerDefinition[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const journalName = journal?.name ?? (t["journal.noJournalTitle"] || "No journal open");
  const showEntry = entry !== null && journal !== null;

  useEffect(() => {
    if (entry) {
      setTitle(entry.metadata.title);
      setBody(entry.body);
      setTags(entry.metadata.tags ?? []);
      setFavorite(entry.metadata.favorite ?? false);
      setMood(entry.metadata.mood ?? "");
      setTrackerValues(entry.metadata.trackers ?? {});
      setDirty(false);
      setConfirmDelete(false);
    }
  }, [entry?.metadata.id, entry?.path]);

  const doSave = useCallback(async (t: string, b: string, tg: string[], fav: boolean, m: string, rec: EntryRecord, tr?: Record<string, string | number | boolean | null>, force = false) => {
    setSaving(true);
    const updated = { ...rec.metadata, title: t, tags: tg, favorite: fav, mood: m || undefined, trackers: tr ?? rec.metadata.trackers };
    try {
      await saveEntry(rec.path, updated, b, force);
      setConflict(false);
      const wordCount = b.trim() ? b.trim().split(/\s+/).length : 0;
      onEntryUpdated({ path: rec.path, metadata: updated, body: b, wordCount });
      setDirty(false);
    } catch (e) {
      if ((e as ConflictError).name === "ConflictError") {
        setConflict(true);
      }
    }
    setSaving(false);
  }, [onEntryUpdated]);

  const scheduleSave = useCallback((t: string, b: string, tg: string[], fav: boolean, m: string, rec: EntryRecord, tr: Record<string, string | number | boolean | null>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(t, b, tg, fav, m, rec, tr), 2000);
  }, [doSave]);

  const markDirty = useCallback((t: string, b: string, tg: string[], fav: boolean, m: string, rec: EntryRecord, tr: Record<string, string | number | boolean | null>) => {
    setDirty(true);
    if (entry && journal) scheduleSave(t, b, tg, fav, m, rec, tr);
  }, [entry, journal, scheduleSave]);

  const handleTitleChange = (value: string) => { setTitle(value); if (entry) markDirty(value, body, tags, favorite, mood, entry, trackerValues); };
  const handleBodyChange = (value: string) => { setBody(value); if (entry) markDirty(title, value, tags, favorite, mood, entry, trackerValues); };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag || tags.includes(newTag)) { setTagInput(""); return; }
    const next = [...tags, newTag];
    setTags(next);
    setTagInput("");
    if (entry) markDirty(title, body, next, favorite, mood, entry, trackerValues);
  };

  const handleRemoveTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    if (entry) markDirty(title, body, next, favorite, mood, entry, trackerValues);
  };

  const handleToggleFavorite = () => {
    const next = !favorite;
    setFavorite(next);
    if (entry) markDirty(title, body, tags, next, mood, entry, trackerValues);
  };

  const handleSelectMood = (key: string) => {
    const next = mood === key ? "" : key;
    setMood(next);
    setShowMoodPicker(false);
    if (entry) markDirty(title, body, tags, favorite, next, entry, trackerValues);
  };

  const handleInsertImage = async () => {
    if (!entry || !journal) return;
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }],
    });
    const imgPath = Array.isArray(selected) ? selected[0] : selected;
    if (!imgPath) return;
    try {
      const relative = await copyImageToDocumentDir(imgPath, entry.path);
      const imgMd = `![image](${relative})`;
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = body.slice(0, start);
        const after = body.slice(end);
        const newBody = before + imgMd + (after ? (before ? "" : "") : "");
        setBody(newBody);
        if (entry) markDirty(title, newBody, tags, favorite, mood, entry, trackerValues);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + imgMd.length; ta.focus(); });
      }
    } catch (e) {
      console.error("Failed to insert image:", e);
    }
  };

  const handleInsertTable = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const table = "\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n";
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const newBody = before + table + after;
    setBody(newBody);
    if (entry) markDirty(title, newBody, tags, favorite, mood, entry, trackerValues);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + table.length; ta.focus(); });
  };

  useEffect(() => {
    if (journal) {
      getTrackerDefinitions(journal.rootPath).then(setTrackerDefs).catch(() => setTrackerDefs([]));
    } else {
      setTrackerDefs([]);
    }
  }, [journal?.rootPath]);

  const handleTrackerChange = (id: string, value: string | number | boolean | null) => {
    const next = { ...trackerValues, [id]: value };
    if (value === null || value === "" || value === undefined) delete next[id];
    setTrackerValues(next);
    if (entry) markDirty(title, body, tags, favorite, mood, entry, next);
  };

  useEffect(() => {
    if (entry?.metadata.cover) {
      const dir = entry.path.substring(0, entry.path.lastIndexOf("/"));
      loadImage(dir + "/" + entry.metadata.cover).then(setCoverUrl).catch(() => setCoverUrl(null));
    } else {
      setCoverUrl(null);
    }
  }, [entry?.metadata.cover, entry?.path]);

  const handleSetCover = async () => {
    if (!entry || !journal) return;
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }],
    });
    const imgPath = Array.isArray(selected) ? selected[0] : selected;
    if (!imgPath) return;
    try {
      const relative = await copyImageToDocumentDir(imgPath, entry.path);
      const updated = { ...entry.metadata, cover: relative };
      await saveEntry(entry.path, updated, body, true);
      setCoverUrl(null);
      const wc = body.trim() ? body.trim().split(/\s+/).length : 0;
      onEntryUpdated({ path: entry.path, metadata: updated, body, wordCount: wc });
    } catch (e) {
      console.error("Failed to set cover:", e);
    }
  };

  const handleRemoveCover = async () => {
    if (!entry) return;
    const updated = { ...entry.metadata, cover: undefined };
    await saveEntry(entry.path, updated, body, true);
    setCoverUrl(null);
    const wc = body.trim() ? body.trim().split(/\s+/).length : 0;
    onEntryUpdated({ path: entry.path, metadata: updated, body, wordCount: wc });
  };

  useEffect(() => {
    if (!entry) { setImageDataUrls([]); return; }
    const refs: string[] = [];
    const re = /!\[.*?\]\((.+?)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const rel = m[1];
      if (!/^(https?:\/|data:)/.test(rel)) {
        const dir = entry.path.substring(0, entry.path.lastIndexOf("/"));
        refs.push(dir + "/" + rel);
      }
    }
    Promise.all(refs.map((p) => loadImage(p).catch(() => ""))).then(setImageDataUrls);
  }, [body, entry]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col" style={{ backgroundColor: tConfig.editorBgHex, color: tConfig.editorFgHex }}>
      {coverUrl && (
        <div className="relative w-full h-32 shrink-0 overflow-hidden" style={{ backgroundColor: tConfig.accentHex + "10" }}>
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          <button type="button" onClick={handleRemoveCover}
            className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 text-xs"
            title="Remove cover"><X size={12} /></button>
        </div>
      )}
      <div className="px-6 py-4 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[11px] opacity-50 font-medium uppercase tracking-wider" style={{ color: tConfig.fgHex }}>
              {journalName}
              {showEntry && <> &middot; {new Date(entry.metadata.date).toLocaleDateString()}</>}
            </p>
            {showEntry ? (
              <input
                type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-2xl font-bold tracking-tight bg-transparent border-none outline-none"
                style={{ color: tConfig.fgHex }} placeholder="Untitled"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: tConfig.fgHex }}>
                {t["journal.noJournalTitle"] || "No entry selected"}
              </h1>
            )}
          </div>
          {showEntry && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button type="button" onClick={handleToggleFavorite}
                className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                title={favorite ? "Remove from favorites" : "Add to favorites"}>
                <Heart size={15} style={{ color: favorite ? "#ef4444" : tConfig.fgHex + "60", fill: favorite ? "#ef4444" : "none" }} />
              </button>
              {onDuplicateEntry && (
                <button type="button" className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ color: tConfig.fgHex + "60" }} title="Duplicate entry"
                  onClick={() => onDuplicateEntry(entry)}>
                  <Copy size={14} />
                </button>
              )}
              <button type="button" onClick={() => setShowInspector(!showInspector)}
                className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                style={{ color: showInspector ? tConfig.accentHex : tConfig.fgHex + "60" }} title="Entry metadata">
                <Info size={14} />
              </button>
              <button type="button" onClick={handleInsertImage}
                className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                style={{ color: tConfig.fgHex + "60" }} title="Insert image">
                <Image size={14} />
              </button>
              <button type="button" onClick={handleInsertTable}
                className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                style={{ color: tConfig.fgHex + "60" }} title="Insert table">
                <Table size={14} />
              </button>
              <button type="button" onClick={handleSetCover}
                className="h-7 px-2 rounded flex items-center justify-center transition-colors hover:opacity-70 text-[11px] font-medium"
                style={{ color: coverUrl ? tConfig.accentHex : tConfig.fgHex + "60" }}
                title={coverUrl ? "Change cover" : "Set cover image"}>
                {coverUrl ? "Cover" : "Cover"}
              </button>
              {journal && (
                <>
                  <button type="button" onClick={() => setShowTrackerManager(true)}
                    className="h-7 px-2 rounded flex items-center justify-center transition-colors hover:opacity-70 text-[11px] font-medium"
                    style={{ color: tConfig.fgHex + "60" }} title="Manage trackers">
                    Trackers
                  </button>
                  <button type="button" onClick={() => setShowTrackerStats(true)}
                    className="h-7 px-2 rounded flex items-center justify-center transition-colors hover:opacity-70 text-[11px] font-medium"
                    style={{ color: tConfig.fgHex + "60" }} title="Tracker statistics">
                    Stats
                  </button>
                </>
              )}
              {onOpenInEditor && (
                <button type="button" className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ color: tConfig.fgHex + "60" }} title={t["journal.editor"] || "Open in Editor"}
                  onClick={() => onOpenInEditor(entry.path)}>
                  <ExternalLink size={14} />
                </button>
              )}
              {onDeleteEntry && (
                <button type="button" className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ color: "#ef4444" }} title="Delete entry"
                  onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        {conflict && (
          <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>
            <AlertTriangle size={12} />
            <span className="flex-1">File modified externally. Save blocked.</span>
            <button type="button" onClick={async () => { await doSave(title, body, tags, favorite, mood, entry!, trackerValues, true); }}
              className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: "#f59e0b30", color: "#f59e0b" }}>Overwrite</button>
            <button type="button" onClick={() => { setConflict(false); onReloadEntry?.(); }}
              className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}>Discard</button>
          </div>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: tConfig.fgHex + "70" }}>
          {showEntry ? (
            <>
              {tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1"
                  style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:opacity-60">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  className="w-16 text-[11px] bg-transparent border-none outline-none"
                  style={{ color: tConfig.fgHex + "60" }}
                  placeholder="+ tag"
                />
                {tagInput.trim() && (
                  <button type="button" onClick={handleAddTag} style={{ color: tConfig.accentHex }}>
                    <Plus size={11} />
                  </button>
                )}
              </div>
              <div className="relative">
                <button type="button" onClick={() => setShowMoodPicker(!showMoodPicker)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] hover:opacity-70"
                  style={{ backgroundColor: mood ? (tConfig.accentHex + "18") : "transparent", color: tConfig.fgHex + "70" }}>
                  {mood ? MOODS.find((m) => m.key === mood)?.emoji : <SmilePlus size={12} />}
                </button>
                {showMoodPicker && (
                  <div className="absolute top-full left-0 mt-1 p-1.5 rounded-lg shadow-xl border z-50 flex flex-wrap gap-1"
                    style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, width: "200px" }}>
                    {MOODS.map((m) => (
                      <button key={m.key} type="button" onClick={() => handleSelectMood(m.key)}
                        className="w-7 h-7 rounded flex items-center justify-center text-sm hover:opacity-70"
                        style={{ backgroundColor: mood === m.key ? tConfig.accentHex + "20" : "transparent" }}>
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {mood && (
                <span className="text-[11px]" style={{ color: tConfig.fgHex + "60" }}>{mood}</span>
              )}
              {trackerDefs.map((def) => {
                const val = trackerValues[def.id] ?? "";
                return (
                  <span key={def.id} className="flex items-center gap-1">
                    <span className="text-[11px] opacity-60">{def.name}</span>
                    {def.type === "boolean" ? (
                      <input type="checkbox" checked={val === true} onChange={(e) => handleTrackerChange(def.id, e.target.checked ? true : null)}
                        className="w-3 h-3 rounded" style={{ accentColor: def.color ?? tConfig.accentHex }} />
                    ) : def.type === "number" ? (
                      <input type="number" value={val as number} onChange={(e) => handleTrackerChange(def.id, e.target.value ? Number(e.target.value) : null)}
                        className="w-14 text-[11px] bg-transparent border rounded px-1 py-0.5 outline-none"
                        style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }}
                        placeholder="0" />
                    ) : (
                      <input type="text" value={val as string} onChange={(e) => handleTrackerChange(def.id, e.target.value || null)}
                        className="w-16 text-[11px] bg-transparent border rounded px-1 py-0.5 outline-none"
                        style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }}
                        placeholder="..." />
                    )}
                    {def.unit && <span className="text-[10px] opacity-40">{def.unit}</span>}
                  </span>
                );
              })}
              <span className="opacity-50 ml-1">{body.trim() ? body.trim().split(/\s+/).length : 0} words</span>
              <span className="opacity-40">{saving ? "Saving..." : dirty ? "Unsaved" : "Saved"}</span>
            </>
          ) : (
            <span className="flex items-center gap-1"><BookOpen size={12} />{t["journal.noJournalDesc"] || "Select an entry"}</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {showEntry ? (
          <>
            <textarea
              ref={textareaRef}
              value={body} onChange={(e) => handleBodyChange(e.target.value)}
              className="w-full min-h-[200px] px-6 py-4 text-sm leading-relaxed bg-transparent border-none outline-none resize-none"
              style={{ color: tConfig.fgHex }} placeholder="Start writing..."
            />
            {imageDataUrls.length > 0 && (
              <div className="px-6 pb-4 flex flex-wrap gap-3">
                {imageDataUrls.map((url, i) => url ? (
                  <img key={i} src={url} alt="" className="max-w-[200px] max-h-[200px] rounded-lg object-cover border"
                    style={{ borderColor: tConfig.uiBorderHex }} />
                ) : null)}
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-4">
            <JournalEmptyState icon={<BookOpen size={36} />}
              title={t["journal.noJournalTitle"] || "No entry selected"}
              description={journal ? (t["journal.emptyStateEntries"] || "Select or create an entry to start writing.") : (t["journal.noJournalDesc"] || "Create or add a journal to start journaling.")}
              tConfig={tConfig} />
          </div>
        )}
      </div>

      {showInspector && showEntry && entry && (
        <div className="border-t px-6 py-3 text-xs space-y-1.5 overflow-y-auto max-h-[200px]" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "04" }}>
          {[
            ["ID", entry.metadata.id],
            ["Schema", `${entry.metadata.schema} v${entry.metadata.schemaVersion}`],
            ["Date", entry.metadata.date],
            ["Created", entry.metadata.createdAt],
            ["Updated", entry.metadata.updatedAt],
            ["Title", entry.metadata.title],
            ["Tags", entry.metadata.tags.join(", ") || "(none)"],
            ["Mood", entry.metadata.mood || "(none)"],
            ["Favorite", String(entry.metadata.favorite ?? false)],
            ["Word count", String(body.trim() ? body.trim().split(/\s+/).length : 0)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <span className="shrink-0 font-medium" style={{ color: tConfig.fgHex + "50", minWidth: "70px" }}>{label}</span>
              <span className="truncate" style={{ color: tConfig.fgHex + "80" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 py-2 border-t text-xs flex items-center gap-4 flex-wrap" style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "70" }}>
        <span>{showEntry ? journalName : "--"}</span>
        {showEntry && <span className="opacity-40">{entry.metadata.date}</span>}
        <span className="opacity-40">{showEntry ? `${body.trim() ? body.trim().split(/\s+/).length : 0} words` : "--"}</span>
        <span className="ml-auto opacity-50">{saving ? "Saving..." : dirty ? "Unsaved changes" : "Saved"}</span>
      </div>

      {showTrackerManager && journal && (
        <TrackerManagerDialog open={showTrackerManager} tConfig={tConfig}
          journalRootPath={journal.rootPath} onClose={() => setShowTrackerManager(false)} />
      )}
      {showTrackerStats && (
        <TrackerStatsPanel open={showTrackerStats} tConfig={tConfig}
          journal={journal} onClose={() => setShowTrackerStats(false)} />
      )}
      {confirmDelete && entry && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[360px] max-w-[90vw] rounded-lg shadow-2xl border p-5" style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
            <h3 className="text-sm font-semibold mb-2">Delete "{entry.metadata.title}"?</h3>
            <p className="text-xs mb-4" style={{ color: tConfig.fgHex + "70" }}>This action cannot be undone. The entry file will be deleted.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs font-medium rounded border"
                style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>Cancel</button>
              <button type="button" onClick={() => { setConfirmDelete(false); onDeleteEntry?.(entry); }}
                className="px-3 py-1.5 text-xs font-semibold rounded" style={{ color: "#fff", backgroundColor: "#ef4444" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
