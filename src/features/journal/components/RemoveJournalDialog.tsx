import { AlertTriangle } from "lucide-react";
import type { ThemeConfig } from "../../../types";

interface RemoveJournalDialogProps {
  open: boolean;
  journalName: string;
  journalPath: string;
  tConfig: ThemeConfig;
  onClose: () => void;
  onConfirm: () => void;
}

export function RemoveJournalDialog({ open, journalName, journalPath, tConfig, onClose, onConfirm }: RemoveJournalDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[420px] max-w-[95vw] rounded-lg shadow-2xl border"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: tConfig.uiBorderHex }}>
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#fef2f2", color: "#ef4444" }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Remove "{journalName}" from library?</h2>
            <p className="text-xs mt-0.5" style={{ color: tConfig.fgHex + "70" }}>
              This will NOT delete the folder or its contents. The journal can be added again later.
            </p>
          </div>
        </div>

        <div
          className="px-5 py-3 text-xs font-mono rounded mx-4 my-3 border"
          style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.bgHex, color: tConfig.fgHex + "70" }}
        >
          {journalPath}
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
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs font-semibold rounded transition-colors"
            style={{ color: "#ffffff", backgroundColor: "#ef4444" }}
          >
            Remove from library
          </button>
        </div>
      </div>
    </div>
  );
}
