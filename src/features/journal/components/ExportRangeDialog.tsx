import { useState } from "react";
import { X, Download, AlertTriangle } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { openFileDialog } from "../../../services/filesystem";
import { exportDateRange } from "../domain/export-service";

interface ExportRangeDialogProps {
  open: boolean;
  tConfig: ThemeConfig;
  journalRootPath: string;
  onClose: () => void;
}

export function ExportRangeDialog({ open, tConfig, journalRootPath, onClose }: ExportRangeDialogProps) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!fromDate || !toDate) return;
    setError(null);
    const dir = await openFileDialog({ directory: true, multiple: false, title: "Export to..." });
    const destDir = Array.isArray(dir) ? dir[0] : dir;
    if (!destDir) return;

    setExporting(true);
    setProgress({ done: 0, total: 0 });
    try {
      const result = await exportDateRange(journalRootPath, fromDate, toDate, destDir, format, (done, total) => {
        setProgress({ done, total });
      });
      if (result.errors.length > 0) {
        setError(`${result.exported} exported, ${result.errors.length} failed.`);
      }
      if (result.exported === 0 && result.errors.length === 0) {
        setError("No entries found in the selected date range.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
    setExporting(false);
    setProgress(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] max-w-[90vw] rounded-lg shadow-2xl border flex flex-col"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <h3 className="text-sm font-semibold">Export date range</h3>
          <button type="button" onClick={onClose} className="hover:opacity-60"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "80" }}>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded border bg-transparent outline-none text-xs"
                style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "80" }}>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded border bg-transparent outline-none text-xs"
                style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: tConfig.fgHex + "80" }}>Format</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="format" checked={format === "markdown"} onChange={() => setFormat("markdown")} />
                Markdown
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="radio" name="format" checked={format === "html"} onChange={() => setFormat("html")} />
                HTML
              </label>
            </div>
          </div>

          {progress && (
            <div className="text-xs" style={{ color: tConfig.fgHex + "70" }}>
              Exporting... {progress.done}/{progress.total}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2 rounded text-xs" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded border"
            style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>Cancel</button>
          <button type="button" onClick={handleExport} disabled={exporting || !fromDate || !toDate}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            <Download size={12} /> {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
