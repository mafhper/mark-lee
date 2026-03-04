import React, { useState } from "react";
import { ThemeConfig } from "../../types";

export type ExportFormat = "markdown" | "markdown_formatted" | "markdown_minified" | "pdf" | "html";

interface ExportModalProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onClose: () => void;
  onConfirm: (format: ExportFormat) => void;
}

const formats: ExportFormat[] = [
  "markdown",
  "markdown_formatted",
  "markdown_minified",
  "pdf",
  "html",
];

const labels: Record<ExportFormat, string> = {
  markdown: "Markdown",
  markdown_formatted: "Markdown (Formatted)",
  markdown_minified: "Markdown (Minified)",
  pdf: "PDF",
  html: "HTML",
};

const ExportModal: React.FC<ExportModalProps> = ({ open, t, tConfig, onClose, onConfirm }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("markdown");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div
        className={`w-[420px] max-w-[94vw] rounded-xl border shadow-xl ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`px-4 py-3 border-b ${tConfig.uiBorder} text-sm font-semibold`}>
          {t["export.title"] || "Export"}
        </div>
        <div className="p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide">
            {t["export.format"] || "Format"}
          </div>
          {formats.map((format) => (
            <button
              key={format}
              className={`w-full text-left px-3 py-2 rounded border text-sm ${
                selectedFormat === format
                  ? "ml-btn-active"
                  : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/10`
              }`}
              onClick={() => setSelectedFormat(format)}
            >
              {labels[format]}
            </button>
          ))}
        </div>
        <div className={`p-4 border-t ${tConfig.uiBorder} flex justify-end gap-2`}>
          <button
            className="px-3 py-1.5 rounded text-xs border ml-btn"
            onClick={onClose}
          >
            {t["save.cancel"] || "Cancel"}
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs ml-btn-primary"
            onClick={() => onConfirm(selectedFormat)}
          >
            {t["export.confirm"] || "Export"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
