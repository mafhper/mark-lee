import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, ExternalLink, Trash2 } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import type { EntryRecord } from "../domain/entry-service";
import { saveEntry } from "../domain/entry-service";
import { JournalEmptyState } from "./JournalEmptyState";

interface JournalEntryPanelProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  entry: EntryRecord | null;
  onEntryUpdated: (entry: EntryRecord) => void;
  onOpenInEditor?: (path: string) => void;
  onDeleteEntry?: (entry: EntryRecord) => void;
}

export function JournalEntryPanel({ t, tConfig, journal, entry, onEntryUpdated, onOpenInEditor, onDeleteEntry }: JournalEntryPanelProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const journalName = journal?.name ?? (t["journal.noJournalTitle"] || "No journal open");
  const showEntry = entry !== null && journal !== null;

  useEffect(() => {
    if (entry) {
      setTitle(entry.metadata.title);
      setBody(entry.body);
      setDirty(false);
      setConfirmDelete(false);
    }
  }, [entry?.metadata.id, entry?.path]);

  const doSave = useCallback(async (t: string, b: string, rec: EntryRecord) => {
    setSaving(true);
    const updated = { ...rec.metadata, title: t };
    await saveEntry(rec.path, updated, b);
    const wordCount = b.trim() ? b.trim().split(/\s+/).length : 0;
    onEntryUpdated({ path: rec.path, metadata: updated, body: b, wordCount });
    setDirty(false);
    setSaving(false);
  }, [onEntryUpdated]);

  const scheduleSave = useCallback((t: string, b: string, rec: EntryRecord) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(t, b, rec), 2000);
  }, [doSave]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setDirty(true);
    if (entry && journal) scheduleSave(value, body, entry);
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setDirty(true);
    if (entry && journal) scheduleSave(title, value, entry);
  };

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col" style={{ backgroundColor: tConfig.editorBgHex, color: tConfig.editorFgHex }}>
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
        <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: tConfig.fgHex + "70" }}>
          {showEntry ? (
            <>
              {entry.metadata.tags.length > 0 && entry.metadata.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded text-[11px]" style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>{tag}</span>
              ))}
              <span className="opacity-50">{body.trim() ? body.trim().split(/\s+/).length : 0} words</span>
              <span className="opacity-40">{saving ? "Saving..." : dirty ? "Unsaved" : "Saved"}</span>
            </>
          ) : (
            <span className="flex items-center gap-1"><BookOpen size={12} />{t["journal.noJournalDesc"] || "Select an entry"}</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {showEntry ? (
          <textarea
            value={body} onChange={(e) => handleBodyChange(e.target.value)}
            className="w-full h-full min-h-[200px] px-6 py-4 text-sm leading-relaxed bg-transparent border-none outline-none resize-none"
            style={{ color: tConfig.fgHex }} placeholder="Start writing..."
          />
        ) : (
          <div className="px-6 py-4">
            <JournalEmptyState icon={<BookOpen size={36} />}
              title={t["journal.noJournalTitle"] || "No entry selected"}
              description={journal ? (t["journal.emptyStateEntries"] || "Select or create an entry to start writing.") : (t["journal.noJournalDesc"] || "Create or add a journal to start journaling.")}
              tConfig={tConfig} />
          </div>
        )}
      </div>

      <div className="px-6 py-2 border-t text-xs flex items-center gap-4 flex-wrap" style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "70" }}>
        <span>{showEntry ? journalName : "--"}</span>
        {showEntry && <span className="opacity-40">{entry.metadata.date}</span>}
        <span className="opacity-40">{showEntry ? `${body.trim() ? body.trim().split(/\s+/).length : 0} words` : "--"}</span>
        <span className="ml-auto opacity-50">{saving ? "Saving..." : dirty ? "Unsaved changes" : "Saved"}</span>
      </div>

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
