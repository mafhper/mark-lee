import { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { openFileDialog } from "../../../services/filesystem";
import { checkManifest } from "../domain/manifest-service";
import type { JournalManifest, JournalDescriptor, ManifestCheckResult } from "../domain/journal.types";

interface AddExistingJournalDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onClose: () => void;
  onAdded: (journal: JournalDescriptor) => void;
}

export function AddExistingJournalDialog({ open, t, tConfig, onClose, onAdded }: AddExistingJournalDialogProps) {
  const [folderPath, setFolderPath] = useState("");
  const [checkResult, setCheckResult] = useState<ManifestCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [relocateTarget, setRelocateTarget] = useState<string | null>(null);

  if (!open) return null;

  const handlePickFolder = async () => {
    const selected = await openFileDialog({ directory: true, multiple: false });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;

    setFolderPath(path);
    setChecking(true);
    setCheckResult(null);

    const result = await checkManifest(path);
    setCheckResult(result);
    setChecking(false);
  };

  const handleAdd = async () => {
    if (!checkResult?.manifest) return;
    const m: JournalManifest = checkResult.manifest;

    setAdding(true);
    const descriptor: JournalDescriptor = {
      id: m.id,
      name: m.name,
      rootPath: relocateTarget ?? folderPath,
      description: m.description,
      schemaVersion: m.schemaVersion,
      createdAt: m.createdAt,
    };

    onAdded(descriptor);
    setFolderPath("");
    setCheckResult(null);
    setRelocateTarget(null);
    setAdding(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[460px] max-w-[95vw] rounded-lg shadow-2xl border"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: tConfig.uiBorderHex }}>
          <h2 className="text-base font-semibold">{t["journal.addJournal"] || "Add existing journal"}</h2>
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
              Journal folder
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={folderPath}
                readOnly
                className="flex-1 px-3 py-2 text-sm rounded border outline-none bg-transparent truncate"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "80" }}
                placeholder="Select the journal folder..."
              />
              <button
                type="button"
                onClick={handlePickFolder}
                className="px-3 py-2 text-xs font-medium rounded border transition-colors shrink-0"
                style={{ color: tConfig.accentHex, borderColor: tConfig.accentHex + "40", backgroundColor: tConfig.accentHex + "10" }}
              >
                Browse...
              </button>
            </div>
          </div>

          {checking && (
            <div className="flex items-center gap-2 py-3 text-sm" style={{ color: tConfig.fgHex + "70" }}>
              <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: tConfig.accentHex + "60", borderTopColor: "transparent" }} />
              Checking...
            </div>
          )}

          {checkResult && !checkResult.valid && (
            <div
              className="flex items-start gap-3 p-3 rounded border text-sm"
              style={{ borderColor: "#fca5a5", backgroundColor: "#fef2f2", color: "#991b1b" }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Cannot add this journal</p>
                <p className="text-xs mt-0.5 opacity-80">{checkResult.error || "Unknown error."}</p>
              </div>
            </div>
          )}

          {checkResult?.manifest && (
            <div
              className="flex items-start gap-3 p-3 rounded border text-sm"
              style={{ borderColor: "#86efac", backgroundColor: "#f0fdf4", color: "#166534" }}
            >
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Journal found</p>
                <p className="font-semibold mt-1">{checkResult.manifest.name}</p>
                {checkResult.manifest.description && (
                  <p className="text-xs mt-0.5 opacity-80">{checkResult.manifest.description}</p>
                )}
                <p className="text-xs mt-1 opacity-70">
                  Created: {new Date(checkResult.manifest.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
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
          {checkResult?.manifest && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40"
              style={{ color: "#ffffff", backgroundColor: tConfig.accentHex }}
            >
              {adding ? "Adding..." : t["journal.addJournal"] || "Add to library"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
