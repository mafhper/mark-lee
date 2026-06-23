import { useState } from "react";
import type { ThemeConfig } from "../../../types";
import { openFileDialog } from "../../../services/filesystem";
import { createJournal } from "../domain/manifest-service";
import type { JournalDescriptor } from "../domain/journal.types";

interface CreateJournalDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  defaultLanguage: string;
  journalDataDir?: string;
  onClose: () => void;
  onCreated: (journal: JournalDescriptor) => void;
}

export function CreateJournalDialog({ open, t, tConfig, defaultLanguage, journalDataDir, onClose, onCreated }: CreateJournalDialogProps) {
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [folderManuallySet, setFolderManuallySet] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!folderManuallySet) suggestFolder(value);
  };

  if (!open) return null;

  const suggestFolder = (journalName: string) => {
    if (journalDataDir && journalName.trim()) {
      const safeName = journalName.trim().replace(/[^a-zA-Z0-9_\-\s]/g, "").replace(/\s+/g, "-").toLowerCase();
      setFolderPath(`${journalDataDir}/${safeName}`);
    }
  };

  const handlePickFolder = async () => {
    const selected = await openFileDialog({ directory: true, multiple: false, defaultPath: journalDataDir });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (path) {
      setFolderPath(path);
      setFolderManuallySet(true);
      setError("");
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a journal name.");
      return;
    }
    if (!folderPath) {
      setError("Please select a folder.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const descriptor = await createJournal(folderPath, name.trim(), description.trim() || undefined, defaultLanguage);
      onCreated(descriptor);
      setName("");
      setFolderPath("");
      setDescription("");
      setError("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create journal.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[440px] max-w-[95vw] rounded-lg shadow-2xl border"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: tConfig.uiBorderHex }}>
          <h2 className="text-base font-semibold">{t["journal.newJournal"] || "New journal"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center text-sm hover:opacity-70"
            style={{ color: tConfig.fgHex + "80" }}
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "90" }}>
              {t["journal.newJournal"] || "Journal name"} *
            </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border outline-none bg-transparent"
              style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
              placeholder={t["journal.noJournalTitle"] || "My journal"}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "90" }}>
              {t["journal.noJournalDesc"] || "Description"} (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border outline-none bg-transparent"
              style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "90" }}>
              Folder *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={folderPath}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded border outline-none bg-transparent truncate"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "80" }}
                placeholder="Select a folder..."
              />
              <button
                type="button"
                onClick={handlePickFolder}
                className="px-3 py-2 text-xs font-medium rounded border transition-colors shrink-0"
                style={{
                  color: tConfig.accentHex,
                  borderColor: tConfig.accentHex + "40",
                  backgroundColor: tConfig.accentHex + "10",
                }}
              >
                Browse...
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: tConfig.fgHex + "50" }}>
              A <code>.marklee/journal.json</code> file will be created in this folder.
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#ef4444" }}>
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: tConfig.uiBorderHex }}>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded border transition-colors"
            style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim() || !folderPath}
            className="px-4 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40"
            style={{
              color: "#ffffff",
              backgroundColor: tConfig.accentHex,
            }}
          >
            {creating ? "Creating..." : t["journal.newJournal"] || "Create journal"}
          </button>
        </div>
      </div>
    </div>
  );
}
