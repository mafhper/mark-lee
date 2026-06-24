import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BookOpen, ExternalLink, Trash2, Heart, Plus, X, Copy, AlertTriangle, SmilePlus, Info, Image, Download, Globe, MapPin, MoreHorizontal, Activity, TrendingUp, Maximize2, Tag, FolderPlus, ChevronDown, ChevronUp } from "lucide-react";

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
import { saveEntry, readEntry } from "../domain/entry-service";
import { openFileDialog, copyImageToDocumentDir, loadImage } from "../../../services/filesystem";
import { exportEntryAsMarkdown, exportEntryAsHtml } from "../domain/export-service";
import { TrackerManagerDialog } from "./TrackerManagerDialog";
import { TrackerStatsPanel } from "./TrackerStatsPanel";
import { getTrackerDefinitions } from "../domain/tracker-service";
import type { TrackerDefinition } from "../domain/journal.types";
import { JournalEmptyState } from "./JournalEmptyState";
import { JournalGettingStarted } from "./JournalGettingStarted";
import { JournalLightbox } from "./JournalLightbox";
import MarkdownPreview from "../../../app/markdown/MarkdownPreview";
import { JournalPublicationView } from "./JournalPublicationView";
import { EditorView } from "@codemirror/view";
import { openSearchPanel } from "@codemirror/search";
import { MarkdownEditor } from "../../editor/MarkdownEditor";
import { activeDocPathRef } from "../../editor/active-editor";
import { setActiveTarget, registerFlushHandler, setEntryTrackerAdjuster, setEntryFavoriteToggler } from "../../editor/active-target";
import { resolveEntryAssetPath } from "../domain/export-paths";
import { formatMarkdown, minifyMarkdown } from "../../../services/markdown-processor";

interface JournalEntryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entry: EntryRecord | null;
  viewMode?: "edit" | "split" | "preview";
  onEntryUpdated: (entry: EntryRecord) => void;
  onOpenInEditor?: (path: string) => void;
  onDeleteEntry?: (entry: EntryRecord) => void;
  onDuplicateEntry?: (entry: EntryRecord) => void;
  onReloadEntry?: () => void;
  onNewEntry?: () => void;
  onCreateJournal?: () => void;
  onAddJournal?: () => void;
  prevEntry?: EntryRecord | null;
  nextEntry?: EntryRecord | null;
  onNavigateEntry?: (entry: EntryRecord) => void;
  language?: string;
  hasEntries?: boolean;
  readOnly?: boolean;
}

function DropdownItem({ icon: Icon, label, danger, onClick }: { icon: any; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:opacity-70 text-left"
      style={{ color: danger ? "#ef4444" : undefined }}>
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );
}

function MetaChip({ icon, label, active, open, tConfig, onClick, disabled }: {
  icon: React.ReactNode; label: string; active?: boolean; open?: boolean; tConfig: ThemeConfig; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} disabled={disabled}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: open ? tConfig.accentHex + "22" : active ? tConfig.accentHex + "14" : tConfig.uiHex,
        color: active || open ? tConfig.accentHex : tConfig.fgHex + "75",
        border: `1px solid ${open ? tConfig.accentHex + "55" : "transparent"}`,
      }}>
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
    </button>
  );
}

export function JournalEntryPanel({ t, tConfig, journal, entry, viewMode, onEntryUpdated, onOpenInEditor, onDeleteEntry, onDuplicateEntry, onReloadEntry, onNewEntry, onCreateJournal, onAddJournal, prevEntry, nextEntry, onNavigateEntry, language = "en", hasEntries = false, readOnly = false }: JournalEntryPanelProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [mood, setMood] = useState("");
  const [trackerValues, setTrackerValues] = useState<Record<string, string | number | boolean | null>>({});
  const [tagInput, setTagInput] = useState("");
  type MetaPopover = null | "tags" | "mood" | "location" | "trackers";
  const [openPopover, setOpenPopover] = useState<MetaPopover>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  type SaveState = "clean" | "dirty" | "saving" | "error" | "conflict";
  const [saveState, setSaveState] = useState<SaveState>("clean");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showTrackerManager, setShowTrackerManager] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showTrackerStats, setShowTrackerStats] = useState(false);
  const [trackerDefs, setTrackerDefs] = useState<TrackerDefinition[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // Inline cover height toggle — a middle ground between the thin band and the
  // full-screen lightbox: see more of the cover without leaving the entry.
  const [coverExpanded, setCoverExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [locationAttraction, setLocationAttraction] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  // Latest handlers exposed to the global toolbar target. Kept in a ref so the
  // registered target always calls current closures, never a stale render's.
  const targetHandlersRef = useRef<{
    format: () => void; minify: () => void; doExport: () => void; find: () => void;
    adjustTracker: (entryId: string, trackerId: string, delta: number) => boolean;
    toggleFavorite: (entryId: string) => boolean;
  }>({
    format: () => {},
    minify: () => {},
    doExport: () => {},
    find: () => {},
    adjustTracker: () => false,
    toggleFavorite: () => false,
  });

  interface PendingSave {
    rec: EntryRecord; t: string; b: string; tg: string[]; fav: boolean; m: string;
    tr: Record<string, string | number | boolean | null>;
    loc: ReturnType<typeof buildLocation>;
    /** Root-relative cover path; part of the draft so concurrent edits keep it. */
    cover: string | undefined;
    /** Monotonic draft revision; only the latest may mark the doc clean. */
    revision: number;
    /** Set once this exact snapshot has been persisted, so the serial queue never writes it twice. */
    saved?: boolean;
  }
  const pendingSaveRef = useRef<PendingSave | null>(null);
  // The cover lives in the draft (a ref, since it isn't edited through a field) so
  // every snapshot — autosave, tracker adjust, cover set/remove — carries the
  // current cover and a typed edit can never silently drop a just-set cover.
  const coverRelRef = useRef<string | undefined>(undefined);
  // Latest tracker values, so the Pins +/- delegate can compound rapid clicks off
  // the freshest value instead of a stale render closure.
  const trackerValuesRef = useRef(trackerValues);
  trackerValuesRef.current = trackerValues;
  // Serial save chain: every save is appended so writes for one entry can never
  // interleave or finish out of order (which would trip artificial mtime
  // conflicts or let a stale write win).
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Highest revision handed to scheduleSave/currentSnapshot. A save may only set
  // saveState to "clean" when its snapshot is still the latest revision.
  const draftRevisionRef = useRef(0);

  const journalName = journal?.name ?? (t["journal.noJournalTitle"] || "No journal open");
  const showEntry = entry !== null && journal !== null;

  // All images belonging to the current entry (cover first, then inline body
  // images), as filesystem paths for the lightbox. Reflects live edits to body.
  const entryImages = useMemo(() => {
    if (!entry) return [] as string[];
    const imgs: string[] = [];
    if (entry.metadata.cover) {
      const cover = resolveEntryAssetPath(entry.path, entry.metadata.cover);
      if (cover) imgs.push(cover);
    }
    const re = /!\[.*?\]\((.+?)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      // resolveEntryAssetPath rejects external (http/data), absolute and `..` refs,
      // so the lightbox/load_image only ever sees files inside this entry's folder.
      const full = resolveEntryAssetPath(entry.path, m[1]);
      if (full && !imgs.includes(full)) imgs.push(full);
    }
    return imgs;
  }, [entry?.path, entry?.metadata.cover, body]);

  const buildLocation = () => {
    if (!locationLabel && !locationCity && !locationState && !locationCountry) return undefined;
    return {
      label: locationLabel || [locationCity, locationState, locationCountry].filter(Boolean).join(", ") || "",
      latitude: locationLat ? Number(locationLat) : undefined,
      longitude: locationLng ? Number(locationLng) : undefined,
      source: "manual" as const,
      city: locationCity || undefined,
      state: locationState || undefined,
      country: locationCountry || undefined,
      attraction: locationAttraction || undefined,
    };
  };

  const buildLocationFrom = (
    label: string, lat?: number, lng?: number,
    city?: string, state?: string, country?: string, attraction?: string,
  ) => {
    if (!label && !city && !state && !country) return undefined;
    return {
      label: label || [city, state, country].filter(Boolean).join(", ") || "",
      latitude: lat,
      longitude: lng,
      source: "manual" as const,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      attraction: attraction || undefined,
    };
  };

  // Persist one snapshot. Appended to a serial queue so writes never overlap, and
  // returns whether the write succeeded so flush callers (e.g. window close) know
  // if anything was lost. Resolves to `true` on success, `false` on failure.
  const doSave = useCallback((snap: PendingSave, force = false): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      // Idempotency: a flush issued while this snapshot is already in-flight (or
      // done) must not write it a second time.
      if (snap.saved) return true;
      const updated = {
        ...snap.rec.metadata,
        title: snap.t,
        tags: snap.tg,
        favorite: snap.fav,
        mood: snap.m || undefined,
        trackers: snap.tr ?? snap.rec.metadata.trackers,
        location: snap.loc,
        cover: snap.cover,
      };
      setSaveState("saving");
      try {
        await saveEntry(snap.rec.path, updated, snap.b, force);
        snap.saved = true;
        // Clear the pending snapshot only on success, and only if a newer edit
        // hasn't replaced it mid-flight — so Retry/flush always have a snapshot.
        if (pendingSaveRef.current === snap) pendingSaveRef.current = null;
        // Only the most recent revision may declare the document clean; if the
        // user kept typing while this save ran, a newer save is still pending.
        if (snap.revision === draftRevisionRef.current) setSaveState("clean");
        const wordCount = snap.b.trim() ? snap.b.trim().split(/\s+/).length : 0;
        onEntryUpdated({ path: snap.rec.path, metadata: updated, body: snap.b, wordCount });
        return true;
      } catch (e) {
        // Keep pendingSaveRef intact so the error banner's Retry can re-send it.
        if ((e as ConflictError).name === "ConflictError") {
          setSaveState("conflict");
        } else {
          setSaveState("error");
        }
        return false;
      }
    };
    const queued = saveQueueRef.current.then(run, run);
    // Keep the chain alive regardless of this save's outcome (run never rejects).
    saveQueueRef.current = queued.then(() => {}, () => {});
    return queued;
  }, [onEntryUpdated]);

  const scheduleSave = useCallback((
    rec: EntryRecord, t: string, b: string, tg: string[], fav: boolean, m: string,
    tr: Record<string, string | number | boolean | null>,
    loc: ReturnType<typeof buildLocation>,
  ) => {
    const snap: PendingSave = { rec, t, b, tg, fav, m, tr, loc, cover: coverRelRef.current, revision: ++draftRevisionRef.current };
    pendingSaveRef.current = snap;
    setSaveState("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const ps = pendingSaveRef.current;
      if (ps) doSave(ps);
    }, 2000);
  }, [doSave]);

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const ps = pendingSaveRef.current;
    if (ps) return doSave(ps);
    // Nothing queued by us; still wait for any in-flight save to settle so the
    // caller can trust the disk is current.
    await saveQueueRef.current;
    return true;
  }, [doSave]);

  const currentSnapshot = (): PendingSave | null => {
    if (!entry || !journal) return null;
    return {
      rec: entry, t: title, b: body, tg: tags, fav: favorite, m: mood,
      tr: trackerValues, loc: buildLocation(), cover: coverRelRef.current,
      revision: ++draftRevisionRef.current,
    };
  };

  useEffect(() => {
    let cancelled = false;
    flushPendingSave().then(() => {
      if (cancelled || !entry) return;
      setTitle(entry.metadata.title);
      setBody(entry.body);
      coverRelRef.current = entry.metadata.cover;
      activeDocPathRef.current = entry.path;
      setTags(entry.metadata.tags ?? []);
      setFavorite(entry.metadata.favorite ?? false);
      setMood(entry.metadata.mood ?? "");
      setTrackerValues(entry.metadata.trackers ?? {});
      setLocationLabel(entry.metadata.location?.label ?? "");
      setLocationLat(entry.metadata.location?.latitude !== undefined ? String(entry.metadata.location.latitude) : "");
      setLocationLng(entry.metadata.location?.longitude !== undefined ? String(entry.metadata.location.longitude) : "");
      setLocationCity(entry.metadata.location?.city ?? "");
      setLocationState(entry.metadata.location?.state ?? "");
      setLocationCountry(entry.metadata.location?.country ?? "");
      setLocationAttraction(entry.metadata.location?.attraction ?? "");
      setConfirmDelete(false);
      setLightboxIndex(null);
      setCoverExpanded(false);
      if (!cancelled) {
        setActiveTarget({
          kind: "journal-entry",
          save: flushPendingSave,
          find: () => targetHandlersRef.current.find(),
          format: () => targetHandlersRef.current.format(),
          minify: () => targetHandlersRef.current.minify(),
          export: () => targetHandlersRef.current.doExport(),
        });
      }
    });
    if (!entry) {
      activeDocPathRef.current = "";
      setActiveTarget(null);
    }
    return () => {
      cancelled = true;
      setActiveTarget(null);
    };
  }, [entry?.metadata.id, entry?.path, flushPendingSave]);

  const handleTitleChange = (value: string) => { if (readOnly) return; setTitle(value); if (entry && journal) scheduleSave(entry, value, body, tags, favorite, mood, trackerValues, buildLocation()); };
  const handleBodyChange = (value: string) => { if (readOnly) return; setBody(value); if (entry && journal) scheduleSave(entry, title, value, tags, favorite, mood, trackerValues, buildLocation()); };

  // Format/minify the entry body through the shared Markdown processor. Driven by
  // the global toolbar (and Ctrl-based commands) when a journal entry is active.
  const applyBodyTransform = (mode: "format" | "minify") => {
    const view = editorViewRef.current;
    const current = view ? view.state.doc.toString() : body;
    const next = mode === "format" ? formatMarkdown(current) : minifyMarkdown(current);
    if (next === current) return;
    if (view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    } else {
      handleBodyChange(next);
    }
  };

  const handleAddTag = () => {
    if (readOnly) return;
    const newTag = tagInput.trim();
    if (!newTag || tags.includes(newTag)) { setTagInput(""); return; }
    const next = [...tags, newTag];
    setTags(next);
    setTagInput("");
    if (entry && journal) scheduleSave(entry, title, body, next, favorite, mood, trackerValues, buildLocation());
  };

  const handleRemoveTag = (tag: string) => {
    if (readOnly) return;
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    if (entry && journal) scheduleSave(entry, title, body, next, favorite, mood, trackerValues, buildLocation());
  };

  const handleToggleFavorite = () => {
    if (readOnly) return;
    const next = !favorite;
    setFavorite(next);
    if (entry && journal) scheduleSave(entry, title, body, tags, next, mood, trackerValues, buildLocation());
  };

  const handleSelectMood = (key: string) => {
    if (readOnly) return;
    const next = mood === key ? "" : key;
    setMood(next);
    setOpenPopover(null);
    if (entry && journal) scheduleSave(entry, title, body, tags, favorite, next, trackerValues, buildLocation());
  };

  // Edit any location sub-field and persist the full location object in one place.
  const setLocationField = (
    field: "label" | "lat" | "lng" | "city" | "state" | "country" | "attraction",
    value: string,
  ) => {
    if (readOnly) return;
    const current = {
      label: locationLabel, lat: locationLat, lng: locationLng,
      city: locationCity, state: locationState, country: locationCountry, attraction: locationAttraction,
      [field]: value,
    };
    const setters = {
      label: setLocationLabel, lat: setLocationLat, lng: setLocationLng,
      city: setLocationCity, state: setLocationState, country: setLocationCountry, attraction: setLocationAttraction,
    } as const;
    setters[field](value);
    if (entry && journal) {
      scheduleSave(entry, title, body, tags, favorite, mood, trackerValues, buildLocationFrom(
        current.label,
        current.lat ? Number(current.lat) : undefined,
        current.lng ? Number(current.lng) : undefined,
        current.city, current.state, current.country, current.attraction,
      ));
    }
  };

  useEffect(() => {
    if (journal) {
      getTrackerDefinitions(journal.rootPath).then(setTrackerDefs).catch(() => setTrackerDefs([]));
    } else {
      setTrackerDefs([]);
    }
  }, [journal?.rootPath]);

  const handleTrackerChange = (id: string, value: string | number | boolean | null) => {
    if (readOnly) return;
    const next = { ...trackerValues, [id]: value };
    if (value === null || value === "" || value === undefined) delete next[id];
    setTrackerValues(next);
    if (entry && journal) scheduleSave(entry, title, body, tags, favorite, mood, next, buildLocation());
  };

  useEffect(() => {
    if (entry?.metadata.cover) {
      const resolved = resolveEntryAssetPath(entry.path, entry.metadata.cover);
      if (resolved) loadImage(resolved).then(setCoverUrl).catch(() => setCoverUrl(null));
      else setCoverUrl(null);
    } else {
      setCoverUrl(null);
    }
  }, [entry?.metadata.cover, entry?.path]);

  // Persist a cover change together with the *current* draft, through the same
  // serial queue as autosave. The cover goes into the draft ref first, so it is
  // carried by both the flushed pending edit and any edit typed afterwards —
  // neither the new cover nor a just-typed title/mood can revert the other.
  const persistCover = async (cover: string | undefined) => {
    coverRelRef.current = cover;
    await flushPendingSave();
    const snap = currentSnapshot();
    if (!snap) return false;
    pendingSaveRef.current = snap;
    setCoverUrl(null);
    return doSave(snap, true);
  };

  const handleSetCover = async () => {
    if (!entry || !journal || readOnly) return;
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }],
    });
    const imgPath = Array.isArray(selected) ? selected[0] : selected;
    if (!imgPath) return;
    try {
      const relative = await copyImageToDocumentDir(imgPath, entry.path);
      await persistCover(relative);
    } catch (e) {
      console.error("Failed to set cover:", e);
    }
  };

  const handleRemoveCover = async () => {
    if (!entry || readOnly) return;
    try {
      await persistCover(undefined);
    } catch (e) {
      console.error("Failed to remove cover:", e);
    }
  };

  const handleExportEntry = async () => {
    if (!entry) return;
    try {
      const dir = await openFileDialog({ directory: true, multiple: false, title: "Export entry as Markdown..." });
      const destDir = Array.isArray(dir) ? dir[0] : dir;
      if (!destDir) return;
      await exportEntryAsMarkdown(entry, destDir);
      const reloaded = await readEntry(entry.path);
      if (reloaded) onEntryUpdated(reloaded);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  const handleExportHtml = async () => {
    if (!entry) return;
    try {
      const dir = await openFileDialog({ directory: true, multiple: false, title: "Export entry as HTML..." });
      const destDir = Array.isArray(dir) ? dir[0] : dir;
      if (!destDir) return;
      await exportEntryAsHtml(entry, destDir);
      const reloaded = await readEntry(entry.path);
      if (reloaded) onEntryUpdated(reloaded);
    } catch (e) {
      console.error("HTML export failed:", e);
    }
  };

  // Keep the toolbar target's format/minify/export bound to current closures.
  targetHandlersRef.current = {
    format: () => applyBodyTransform("format"),
    minify: () => applyBodyTransform("minify"),
    doExport: () => { void handleExportEntry(); },
    find: () => { const view = editorViewRef.current; if (view) { view.focus(); openSearchPanel(view); } },
    // Pins +/- on the *open* entry: mutate the live draft and persist immediately
    // through the serial queue, so a later autosave can't revert the adjustment
    // and this can't clobber unsaved text. Returns false when a different entry
    // (or none) is open, so the caller falls back to a direct disk write.
    adjustTracker: (entryId, trackerId, delta) => {
      if (!entry || !journal || entry.metadata.id !== entryId) return false;
      // During the break lock, swallow the adjust (claim it handled) so the
      // sidebar's disk-write fallback doesn't bypass the lock either.
      if (readOnly) return true;
      const curRaw = trackerValuesRef.current[trackerId];
      const cur = typeof curRaw === "number" ? curRaw : 0;
      const nextVal = Math.max(0, Math.round((cur + delta) * 100) / 100);
      const nextTrackers = { ...trackerValuesRef.current, [trackerId]: nextVal };
      trackerValuesRef.current = nextTrackers; // compound rapid clicks before re-render
      setTrackerValues(nextTrackers);
      const snap: PendingSave = {
        rec: entry, t: title, b: body, tg: tags, fav: favorite, m: mood,
        tr: nextTrackers, loc: buildLocation(), cover: coverRelRef.current,
        revision: ++draftRevisionRef.current,
      };
      pendingSaveRef.current = snap;
      void doSave(snap, true);
      return true;
    },
    // Toggle favorite from outside (entry-list context menu) through the live
    // draft when this entry is active; persist immediately so the list updates.
    toggleFavorite: (entryId) => {
      if (!entry || !journal || entry.metadata.id !== entryId) return false;
      if (readOnly) return true;
      const next = !favorite;
      setFavorite(next);
      const snap: PendingSave = {
        rec: entry, t: title, b: body, tg: tags, fav: next, m: mood,
        tr: trackerValues, loc: buildLocation(), cover: coverRelRef.current,
        revision: ++draftRevisionRef.current,
      };
      pendingSaveRef.current = snap;
      void doSave(snap, true);
      return true;
    },
  };

  // Register a pending-save flusher so the window-close handler (App) can await it.
  useEffect(() => registerFlushHandler(flushPendingSave), [flushPendingSave]);

  // Expose tracker-adjust and favorite-toggle so the sidebar Pins and the entry
  // context menu route through this draft when this entry is the active one.
  // Stable wrappers; they always call the latest closures.
  useEffect(() => {
    setEntryTrackerAdjuster((entryId, trackerId, delta) =>
      targetHandlersRef.current.adjustTracker(entryId, trackerId, delta));
    setEntryFavoriteToggler((entryId) => targetHandlersRef.current.toggleFavorite(entryId));
    return () => { setEntryTrackerAdjuster(null); setEntryFavoriteToggler(null); };
  }, []);

  // Collapse any open metadata editor as soon as the break lock engages.
  useEffect(() => { if (readOnly) setOpenPopover(null); }, [readOnly]);

  // Close the active metadata popover when clicking outside the chip row.
  useEffect(() => {
    if (!openPopover) return;
    const onDown = (e: MouseEvent) => {
      if (metaRef.current && !metaRef.current.contains(e.target as Node)) setOpenPopover(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openPopover]);

  useEffect(() => {
    const handleBeforeUnload = () => { flushPendingSave(); };
    const handleVisibilityChange = () => {
      if (document.hidden) flushPendingSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col" style={{ backgroundColor: tConfig.editorBgHex, color: tConfig.editorFgHex }}>
      {coverUrl && viewMode !== "preview" && (
        <div className="relative w-full shrink-0 overflow-hidden group transition-[height] duration-300 ease-out"
          style={{ height: coverExpanded ? 384 : 128, backgroundColor: tConfig.accentHex + "10" }}>
          <button type="button" onClick={() => setLightboxIndex(0)} className="block w-full h-full"
            title={t["journal.expand"] || "Open full screen"}>
            <img src={coverUrl} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
          </button>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-black/40 text-white/90"><Maximize2 size={16} /></div>
          </div>
          {entryImages.length > 1 && (
            <button type="button" onClick={() => setLightboxIndex(0)}
              className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full flex items-center gap-1 bg-black/45 text-white/90 text-[11px] hover:bg-black/60">
              <Image size={11} /> {entryImages.length} {t["journal.photos"] || "photos"}
            </button>
          )}
          {/* Inline expand/collapse — grow the cover in place, without the modal. */}
          <button type="button" onClick={() => setCoverExpanded((v) => !v)}
            className="absolute bottom-2 right-2 h-7 w-7 rounded-full flex items-center justify-center bg-black/45 text-white/90 hover:bg-black/60"
            title={coverExpanded ? (t["journal.collapse"] || "Collapse cover") : (t["journal.expandInline"] || "Expand cover")}>
            {coverExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {!readOnly && (
            <button type="button" onClick={handleRemoveCover}
              className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 text-xs"
              title={t["journal.clear"] || "Remove"}><X size={12} /></button>
          )}
        </div>
      )}
      {viewMode === "preview" && showEntry ? null : journal ? (
        <div className="px-6 py-4 border-b" style={{ borderColor: tConfig.uiBorderHex }}>
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[11px] opacity-50 font-medium uppercase tracking-wider" style={{ color: tConfig.fgHex }}>
                {journalName}
                {showEntry && <> &middot; {new Date(entry.metadata.date).toLocaleDateString(language)}</>}
              </p>
              {showEntry ? (
                <input
                  type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)} readOnly={readOnly}
                  className="w-full text-2xl font-bold tracking-tight bg-transparent border-none outline-none"
                  style={{ color: tConfig.fgHex }} placeholder={t["journal.blankEntry"] || "Untitled"}
                />
              ) : (
                <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: tConfig.fgHex }}>
                  {journal
                    ? (t["journal.selectEntry"] || "No entry selected")
                    : (t["journal.noJournalTitle"] || "No journal open")}
                </h1>
              )}
            </div>
            {showEntry && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button type="button" onClick={handleToggleFavorite} disabled={readOnly}
                  className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={favorite
                    ? (t["journal.favorites"] || "Remove from favorites")
                    : (t["journal.favorites"] || "Add to favorites")}>
                  <Heart size={15} style={{ color: favorite ? "#ef4444" : tConfig.fgHex + "60", fill: favorite ? "#ef4444" : "none" }} />
                </button>
                <button type="button" onClick={() => setShowInspector(!showInspector)}
                  className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ color: showInspector ? tConfig.accentHex : tConfig.fgHex + "60" }}
                  title={t["journal.settings"] || "Metadata"}>
                  <Info size={14} />
                </button>
                <div className="relative" ref={moreMenuRef}>
                  <button type="button" onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="h-7 w-7 rounded flex items-center justify-center transition-colors hover:opacity-70"
                    style={{ color: tConfig.fgHex + "60" }} title={t["journal.list"] || "More"}>
                    <MoreHorizontal size={14} />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border shadow-lg py-1"
                      style={{ backgroundColor: tConfig.uiHex, borderColor: tConfig.uiBorderHex }}>
                      {!readOnly && (
                        <DropdownItem icon={Image} label={coverUrl ? (t["journal.changeCover"] || "Change cover") : (t["journal.cover"] || "Cover")} onClick={() => { handleSetCover(); setShowMoreMenu(false); }} />
                      )}
                      {journal && (
                        <>
                          <div className="border-t my-1" style={{ borderColor: tConfig.uiBorderHex }} />
                          <DropdownItem icon={Activity} label={t["journal.trackers"] || "Trackers"} onClick={() => { setShowTrackerManager(true); setShowMoreMenu(false); }} />
                          <DropdownItem icon={TrendingUp} label={t["journal.stats"] || "Stats"} onClick={() => { setShowTrackerStats(true); setShowMoreMenu(false); }} />
                          <DropdownItem icon={Download} label="MD" onClick={() => { handleExportEntry(); setShowMoreMenu(false); }} />
                          <DropdownItem icon={Globe} label="HTML" onClick={() => { handleExportHtml(); setShowMoreMenu(false); }} />
                        </>
                      )}
                      {onDuplicateEntry && (
                        <>
                          <div className="border-t my-1" style={{ borderColor: tConfig.uiBorderHex }} />
                          <DropdownItem icon={Copy} label={t["journal.duplicate"] || "Duplicate"} onClick={() => { onDuplicateEntry(entry); setShowMoreMenu(false); }} />
                        </>
                      )}
                      {onOpenInEditor && (
                        <DropdownItem icon={ExternalLink} label={t["journal.editor"] || "Open in Editor"} onClick={() => { onOpenInEditor(entry.path); setShowMoreMenu(false); }} />
                      )}
                      {onDeleteEntry && !readOnly && (
                        <>
                          <div className="border-t my-1" style={{ borderColor: tConfig.uiBorderHex }} />
                          <DropdownItem icon={Trash2} label={t["journal.delete"] || "Delete"} danger onClick={() => { setConfirmDelete(true); setShowMoreMenu(false); }} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {saveState === "error" && (
            <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>
              <AlertTriangle size={12} />
              <span className="flex-1">{t["journal.saveFailed"] || "Save failed. Your changes are preserved locally."}</span>
              <button type="button" onClick={() => {
                const ps = pendingSaveRef.current;
                if (ps) doSave(ps, true);
              }}
                className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: "#ef444430", color: "#ef4444" }}>{t["journal.retry"] || "Retry"}</button>
            </div>
          )}
          {saveState === "conflict" && (
            <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded text-xs" style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>
              <AlertTriangle size={12} />
              <span className="flex-1">{t["journal.conflictExternal"] || "File modified externally. Save blocked."}</span>
              <button type="button" onClick={async () => { const snap = currentSnapshot(); if (snap) { pendingSaveRef.current = snap; await doSave(snap, true); } }}
                className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: "#f59e0b30", color: "#f59e0b" }}>{t["journal.overwrite"] || "Overwrite"}</button>
              <button type="button" onClick={() => { setSaveState("dirty"); onReloadEntry?.(); }}
                className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: tConfig.accentHex + "20", color: tConfig.accentHex }}>{t["journal.discard"] || "Discard"}</button>
            </div>
          )}
          <div ref={metaRef} className="relative mt-3">
            {showEntry ? (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MetaChip tConfig={tConfig} icon={<Tag size={11} />} active={tags.length > 0} open={openPopover === "tags"} disabled={readOnly}
                    label={tags.length ? tags.slice(0, 2).join(", ") + (tags.length > 2 ? ` +${tags.length - 2}` : "") : (t["journal.tags"] || "Tags")}
                    onClick={() => setOpenPopover(openPopover === "tags" ? null : "tags")} />
                  <MetaChip tConfig={tConfig} disabled={readOnly}
                    icon={mood ? <span className="text-sm leading-none">{MOODS.find((m) => m.key === mood)?.emoji}</span> : <SmilePlus size={11} />}
                    active={!!mood} open={openPopover === "mood"}
                    label={mood ? (t["mood." + mood] || mood) : (t["journal.mood"] || "Mood")}
                    onClick={() => setOpenPopover(openPopover === "mood" ? null : "mood")} />
                  <MetaChip tConfig={tConfig} icon={<MapPin size={11} />} disabled={readOnly}
                    active={!!(locationLabel || locationCity || locationCountry)} open={openPopover === "location"}
                    label={locationLabel || [locationCity, locationCountry].filter(Boolean).join(", ") || (t["journal.places"] || "Location")}
                    onClick={() => setOpenPopover(openPopover === "location" ? null : "location")} />
                  {trackerDefs.length > 0 && (
                    <MetaChip tConfig={tConfig} icon={<Activity size={11} />} disabled={readOnly}
                      active={trackerDefs.some((d) => { const v = trackerValues[d.id]; return v !== undefined && v !== null && v !== ""; })}
                      open={openPopover === "trackers"}
                      label={`${trackerDefs.length} ${t["journal.trackers"] || "Trackers"}`}
                      onClick={() => setOpenPopover(openPopover === "trackers" ? null : "trackers")} />
                  )}
                  <span className="flex-1" />
                  {entryImages.length > 0 && (
                    <button type="button" onClick={() => setLightboxIndex(0)}
                      className="flex items-center gap-1 text-[11px] hover:opacity-70"
                      style={{ color: tConfig.fgHex + "60" }} title={t["journal.photos"] || "Photos"}>
                      <Image size={11} /> {entryImages.length}
                    </button>
                  )}
                  <span className="text-[11px]" style={{ color: tConfig.fgHex + "45" }}>
                    {body.trim() ? body.trim().split(/\s+/).length : 0} {t["journal.words"] || "words"}
                  </span>
                  {saveState !== "clean" && (
                    <span className="text-[10px]" style={{
                      color: saveState === "error" ? "#ef4444" : saveState === "conflict" ? "#f59e0b" : tConfig.fgHex + "50",
                    }}>
                      {saveState === "dirty" && ("\u00B7 " + (t["journal.unsaved"] || "unsaved"))}
                      {saveState === "saving" && ("\u00B7 " + (t["journal.saving"] || "saving") + "\u2026")}
                      {saveState === "error" && ("\u00B7 " + (t["journal.saveError"] || "save error"))}
                      {saveState === "conflict" && ("\u00B7 " + (t["journal.conflict"] || "conflict"))}
                    </span>
                  )}
                </div>

                {openPopover && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 rounded-lg border shadow-xl p-3"
                    style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, minWidth: 240, maxWidth: 340 }}>
                    {openPopover === "tags" && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {tags.length === 0 && (
                            <span className="text-[11px]" style={{ color: tConfig.fgHex + "50" }}>{t["journal.noTags"] || "No tags yet"}</span>
                          )}
                          {tags.map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1"
                              style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                              {tag}
                              <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:opacity-60"><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <input autoFocus type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                            className="flex-1 text-[11px] bg-transparent border rounded px-2 py-1 outline-none"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.addTag"] || "Add tag\u2026"} />
                          <button type="button" onClick={handleAddTag} disabled={!tagInput.trim()}
                            className="h-6 w-6 rounded flex items-center justify-center disabled:opacity-30" style={{ color: tConfig.accentHex }}>
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                    {openPopover === "mood" && (
                      <div className="flex flex-wrap gap-1" style={{ width: 208 }}>
                        {MOODS.map((m) => (
                          <button key={m.key} type="button" onClick={() => handleSelectMood(m.key)}
                            aria-label={t["mood." + m.key] || m.key} title={t["mood." + m.key] || m.key}
                            className="w-8 h-8 rounded flex items-center justify-center text-base hover:opacity-70"
                            style={{ backgroundColor: mood === m.key ? tConfig.accentHex + "22" : "transparent" }}>
                            {m.emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    {openPopover === "location" && (
                      <div className="space-y-1.5" style={{ width: 288 }}>
                        <input type="text" value={locationLabel} onChange={(e) => setLocationField("label", e.target.value)}
                          className="w-full text-[11px] bg-transparent border rounded px-2 py-1 outline-none"
                          style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.locationLabel"] || "Place name"} />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input type="text" value={locationCity} onChange={(e) => setLocationField("city", e.target.value)}
                            className="text-[11px] bg-transparent border rounded px-2 py-1 outline-none"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.city"] || "City"} />
                          <input type="text" value={locationState} onChange={(e) => setLocationField("state", e.target.value)}
                            className="text-[11px] bg-transparent border rounded px-2 py-1 outline-none"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.state"] || "State"} />
                          <input type="text" value={locationCountry} onChange={(e) => setLocationField("country", e.target.value)}
                            className="text-[11px] bg-transparent border rounded px-2 py-1 outline-none"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.country"] || "Country"} />
                          <input type="text" value={locationAttraction} onChange={(e) => setLocationField("attraction", e.target.value)}
                            className="text-[11px] bg-transparent border rounded px-2 py-1 outline-none"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.attraction"] || "Place"} />
                          <input type="text" inputMode="decimal" value={locationLat} onChange={(e) => setLocationField("lat", e.target.value)}
                            className="text-[11px] bg-transparent border rounded px-2 py-1 outline-none font-mono"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.latitude"] || "Lat"} />
                          <input type="text" inputMode="decimal" value={locationLng} onChange={(e) => setLocationField("lng", e.target.value)}
                            className="text-[11px] bg-transparent border rounded px-2 py-1 outline-none font-mono"
                            style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder={t["journal.longitude"] || "Lng"} />
                        </div>
                      </div>
                    )}
                    {openPopover === "trackers" && (
                      <div className="space-y-2" style={{ minWidth: 220 }}>
                        {trackerDefs.map((def) => {
                          const val = trackerValues[def.id] ?? "";
                          return (
                            <div key={def.id} className="flex items-center justify-between gap-3">
                              <span className="text-[11px] flex items-center gap-1.5" style={{ color: tConfig.fgHex + "85" }}>
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: def.color ?? tConfig.accentHex }} />
                                {def.name}{def.unit ? <span className="opacity-40"> ({def.unit})</span> : null}
                              </span>
                              {def.type === "boolean" ? (
                                <input type="checkbox" checked={val === true} onChange={(e) => handleTrackerChange(def.id, e.target.checked ? true : null)}
                                  style={{ accentColor: def.color ?? tConfig.accentHex }} />
                              ) : def.type === "number" ? (
                                <input type="number" value={val as number} onChange={(e) => handleTrackerChange(def.id, e.target.value ? Number(e.target.value) : null)}
                                  className="w-20 text-[11px] bg-transparent border rounded px-1.5 py-0.5 outline-none"
                                  style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder="0" />
                              ) : (
                                <input type="text" value={val as string} onChange={(e) => handleTrackerChange(def.id, e.target.value || null)}
                                  className="w-24 text-[11px] bg-transparent border rounded px-1.5 py-0.5 outline-none"
                                  style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} placeholder="\u2026" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs" style={{ color: tConfig.fgHex + "70" }}>
                <BookOpen size={12} />{t["journal.noJournalDesc"] || "Select an entry"}
              </span>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex">
        {showEntry ? (
          <div className="flex flex-1 min-h-0">
            {(viewMode === "edit" || viewMode === "split" || !viewMode) && (
              <div className={viewMode === "split" ? "w-1/2 border-r" : "flex-1"} style={{ borderColor: tConfig.uiBorderHex }}>
                <MarkdownEditor
                  value={body}
                  onChange={handleBodyChange}
                  tConfig={tConfig}
                  readOnly={readOnly}
                  onCreateEditor={(view) => { editorViewRef.current = view; }}
                  placeholder={t["journal.startWriting"] || "Start writing..."}
                />
              </div>
            )}
            {viewMode === "preview" && (
              <div className="flex-1">
                <JournalPublicationView tConfig={tConfig} entry={{ ...entry, body }} coverUrl={coverUrl} t={t} language={language}
                  prevEntry={prevEntry} nextEntry={nextEntry} onNavigate={onNavigateEntry} />
              </div>
            )}
            {viewMode === "split" && (
              <div className="w-1/2 overflow-y-auto">
                <MarkdownPreview
                  activePath={entry.path}
                  content={`---\ntitle: ${title}\n---\n\n${body}`}
                  shellBackground={tConfig.editorBgHex}
                />
              </div>
            )}
          </div>
        ) : journal ? (
          <JournalGettingStarted t={t} tConfig={tConfig} hasEntries={hasEntries} onNewEntry={onNewEntry ?? (() => {})} />
        ) : (
          <div className="flex-1 min-h-0">
            <JournalEmptyState icon={<BookOpen size={36} />}
              title={t["journal.noJournalTitle"] || "No notebook open"}
              description={t["journal.noJournalDesc"] || "Create or add a notebook to start recording."}
              tConfig={tConfig}
              actions={[
                ...(onCreateJournal ? [{ label: t["journal.newJournal"] || "New notebook", onSelect: onCreateJournal, icon: <Plus size={15} />, primary: true }] : []),
                ...(onAddJournal ? [{ label: t["journal.addJournal"] || "Add notebook", onSelect: onAddJournal, icon: <FolderPlus size={15} /> }] : []),
              ]}
            />
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
            ["Location", entry.metadata.location?.label || "(none)"],
            ["City", entry.metadata.location?.city || "(none)"],
            ["State", entry.metadata.location?.state || "(none)"],
            ["Country", entry.metadata.location?.country || "(none)"],
            ["Attraction", entry.metadata.location?.attraction || "(none)"],
            ["Word count", String(body.trim() ? body.trim().split(/\s+/).length : 0)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <span className="shrink-0 font-medium" style={{ color: tConfig.fgHex + "50", minWidth: "70px" }}>{label}</span>
              <span className="truncate" style={{ color: tConfig.fgHex + "80" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

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
            <h3 className="text-sm font-semibold mb-1">{t["journal.deleteConfirmTitle"] || "Delete entry?"}</h3>
            <p className="text-sm mb-2 truncate" style={{ color: tConfig.fgHex }}>{entry.metadata.title || (t["journal.blankEntry"] || "Untitled")}</p>
            <p className="text-xs mb-4" style={{ color: tConfig.fgHex + "70" }}>{t["journal.deleteConfirmBody"] || "This action cannot be undone. The entry file will be deleted."}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs font-medium rounded border"
                style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>{t["journal.cancel"] || "Cancel"}</button>
              <button type="button" onClick={() => { setConfirmDelete(false); onDeleteEntry?.(entry); }}
                className="px-3 py-1.5 text-xs font-semibold rounded" style={{ color: "#fff", backgroundColor: "#ef4444" }}>{t["journal.delete"] || "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && entryImages.length > 0 && (
        <JournalLightbox
          src={entryImages[Math.min(lightboxIndex, entryImages.length - 1)]}
          index={Math.min(lightboxIndex, entryImages.length - 1)}
          total={entryImages.length}
          t={t}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={lightboxIndex < entryImages.length - 1 ? () => setLightboxIndex(lightboxIndex + 1) : undefined}
        />
      )}
    </div>
  );
}
