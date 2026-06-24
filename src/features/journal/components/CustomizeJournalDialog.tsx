import { useState } from "react";
import { X, ImagePlus, Trash2, Check } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalDescriptor } from "../domain/journal.types";
import { updateJournalAppearance, setJournalCover } from "../domain/manifest-service";
import { openFileDialog } from "../../../services/filesystem";

interface CustomizeJournalDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  onClose: () => void;
  onSaved: () => void;
}

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#84cc16",
];

export function CustomizeJournalDialog({ open, t, tConfig, journal, onClose, onSaved }: CustomizeJournalDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open || !journal) return null;

  const apply = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleColor = (color: string | null) =>
    apply(() => updateJournalAppearance(journal.rootPath, { color }));

  const handlePickCover = () =>
    apply(async () => {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }],
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;
      await setJournalCover(journal.rootPath, path);
    });

  const handleRemoveCover = () =>
    apply(() => updateJournalAppearance(journal.rootPath, { cover: null }));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[400px] max-w-[95vw] rounded-lg shadow-2xl border"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: tConfig.uiBorderHex }}>
          <h2 className="text-base font-semibold truncate">{t["journal.customize"] || "Customize notebook"}</h2>
          <button type="button" onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center text-sm hover:opacity-70"
            style={{ color: tConfig.fgHex + "80" }}><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: tConfig.fgHex + "90" }}>
              {t["journal.color"] || "Color"}
            </label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button key={c} type="button" disabled={busy} onClick={() => handleColor(c)}
                  aria-label={c} title={c}
                  className="h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: journal.color === c ? `2px solid ${tConfig.fgHex}` : "none", outlineOffset: 2 }}>
                  {journal.color === c && <Check size={14} color="#fff" />}
                </button>
              ))}
              <button type="button" disabled={busy} onClick={() => handleColor(null)}
                title={t["journal.reset"] || "Reset"}
                className="h-7 w-7 rounded-full flex items-center justify-center border text-[10px]"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "70" }}>
                <X size={12} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: tConfig.fgHex + "90" }}>
              {t["journal.cover"] || "Cover"}
            </label>
            <div className="flex items-center gap-2">
              <button type="button" disabled={busy} onClick={handlePickCover}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors disabled:opacity-40"
                style={{ color: tConfig.accentHex, borderColor: tConfig.accentHex + "40", backgroundColor: tConfig.accentHex + "10" }}>
                <ImagePlus size={13} /> {journal.cover ? (t["journal.changeCover"] || "Change cover") : (t["journal.cover"] || "Choose image")}
              </button>
              {journal.cover && (
                <button type="button" disabled={busy} onClick={handleRemoveCover}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors disabled:opacity-40"
                  style={{ color: "#ef4444", borderColor: tConfig.uiBorderHex }}>
                  <Trash2 size={13} /> {t["journal.clear"] || "Remove"}
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-end" style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            {t["journal.done"] || "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
