import { useState } from "react";
import { AlertCircle, CheckCircle, FolderPlus, RefreshCw } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { openFileDialog } from "../../../services/filesystem";
import { checkManifest, repairJournal } from "../domain/manifest-service";
import type { JournalDescriptor, ManifestCheckResult } from "../domain/journal.types";

interface AddExistingJournalDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onClose: () => void;
  onAdded: (journal: JournalDescriptor) => void | Promise<void>;
}

function folderName(path: string): string {
  const base = path.split(/[\\/]/).filter(Boolean).pop() || "";
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AddExistingJournalDialog({ open, t, tConfig, onClose, onAdded }: AddExistingJournalDialogProps) {
  const [folderPath, setFolderPath] = useState("");
  const [checkResult, setCheckResult] = useState<ManifestCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [repairName, setRepairName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => { setFolderPath(""); setCheckResult(null); setRepairName(""); setAddError(null); };
  const close = () => { reset(); onClose(); };

  const handlePickFolder = async () => {
    const selected = await openFileDialog({ directory: true, multiple: false });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    setFolderPath(path);
    setRepairName(folderName(path));
    setChecking(true);
    setCheckResult(null);
    setCheckResult(await checkManifest(path));
    setChecking(false);
  };

  const handleAdd = async () => {
    if (!checkResult?.manifest) return;
    const m = checkResult.manifest;
    setBusy(true);
    setAddError(null);
    try {
      // Awaited so a failed duplicate-id rewrite (DuplicateIdRewriteError) keeps
      // the dialog open with an explanation instead of silently doing nothing.
      await onAdded({ id: m.id, name: m.name, rootPath: folderPath, description: m.description, schemaVersion: m.schemaVersion, createdAt: m.createdAt });
      close();
    } catch {
      setAddError(t["journal.addCopyFailed"] || "This notebook looks like a copy of one already in your library, and its identity couldn't be updated on disk. Check the folder's write permissions and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleRecreate = async () => {
    if (!folderPath) return;
    setBusy(true);
    try {
      const descriptor = await repairJournal(folderPath, { name: repairName.trim() || folderName(folderPath) });
      onAdded(descriptor);
      close();
    } catch (e) {
      setCheckResult({ found: true, valid: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  // "found but invalid" = an incompatible manifest exists; "!found" = no manifest at all.
  const incompatible = checkResult !== null && !checkResult.valid && checkResult.found;
  const empty = checkResult !== null && !checkResult.found;
  const canRecreate = incompatible || empty;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={close}>
      <div className="w-[460px] max-w-[95vw] rounded-lg shadow-2xl border"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: tConfig.uiBorderHex }}>
          <h2 className="text-base font-semibold">{t["journal.addJournal"] || "Add existing notebook"}</h2>
          <button type="button" onClick={close} className="h-6 w-6 rounded flex items-center justify-center text-sm hover:opacity-70"
            style={{ color: tConfig.fgHex + "80" }}>&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "90" }}>
              {t["journal.notebookFolder"] || "Notebook folder"}
            </label>
            <div className="flex items-center gap-2">
              <input type="text" value={folderPath} readOnly
                className="flex-1 px-3 py-2 text-sm rounded border outline-none bg-transparent truncate"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "80" }}
                placeholder={t["journal.selectFolder"] || "Select the notebook folder..."} />
              <button type="button" onClick={handlePickFolder}
                className="px-3 py-2 text-xs font-medium rounded border transition-colors shrink-0"
                style={{ color: tConfig.accentHex, borderColor: tConfig.accentHex + "40", backgroundColor: tConfig.accentHex + "10" }}>
                {t["journal.browse"] || "Browse..."}
              </button>
            </div>
          </div>

          {checking && (
            <div className="flex items-center gap-2 py-3 text-sm" style={{ color: tConfig.fgHex + "70" }}>
              <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: tConfig.accentHex + "60", borderTopColor: "transparent" }} />
              {t["journal.loading"] || "Checking..."}
            </div>
          )}

          {checkResult?.manifest && (
            <div className="flex items-start gap-3 p-3 rounded border text-sm" style={{ borderColor: "#86efac", backgroundColor: "#f0fdf4", color: "#166534" }}>
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t["journal.notebookFound"] || "Notebook found"}</p>
                <p className="font-semibold mt-1">{checkResult.manifest.name}</p>
                {checkResult.manifest.description && <p className="text-xs mt-0.5 opacity-80">{checkResult.manifest.description}</p>}
              </div>
            </div>
          )}

          {addError && (
            <div className="flex items-start gap-3 p-3 rounded border text-sm"
              style={{ borderColor: "#fca5a5", backgroundColor: "#fef2f2", color: "#991b1b" }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs">{addError}</p>
            </div>
          )}

          {canRecreate && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded border text-sm"
                style={{ borderColor: "#fcd34d", backgroundColor: "#fffbeb", color: "#92400e" }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{incompatible ? (t["journal.incompatible"] || "Incompatible notebook") : (t["journal.noNotebookHere"] || "No notebook here")}</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {incompatible ? (checkResult?.error || "") : ""}
                    {" "}{t["journal.recreateHint"] || "You can (re)create the notebook here — your entries and media files are kept."}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "90" }}>
                  {t["journal.notebookName"] || "Notebook name"}
                </label>
                <input type="text" value={repairName} onChange={(e) => setRepairName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border outline-none bg-transparent"
                  style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={close}
            className="px-3 py-1.5 text-xs font-medium rounded border transition-colors"
            style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>
            {t["journal.cancel"] || "Cancel"}
          </button>
          {checkResult?.manifest ? (
            <button type="button" onClick={handleAdd} disabled={busy}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40 flex items-center gap-1.5"
              style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
              <FolderPlus size={13} /> {busy ? "…" : (t["journal.addToLibrary"] || "Add to library")}
            </button>
          ) : canRecreate ? (
            <button type="button" onClick={handleRecreate} disabled={busy || !repairName.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40 flex items-center gap-1.5"
              style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
              <RefreshCw size={13} /> {busy ? "…" : incompatible ? (t["journal.recreate"] || "Recreate notebook") : (t["journal.initialize"] || "Initialize notebook")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
