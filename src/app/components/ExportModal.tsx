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

const ExportModal: React.FC<ExportModalProps> = ({ open, t, tConfig, onClose, onConfirm }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("markdown");
  const labels: Record<ExportFormat, string> = {
    markdown: t["export.markdown.original"] || "Original Markdown",
    markdown_formatted: t["export.markdown.formatted"] || "Formatted Markdown",
    markdown_minified: t["export.markdown.minified"] || "Minified Markdown",
    pdf: "PDF",
    html: "HTML",
  };
  const descriptions: Record<ExportFormat, string> = {
    markdown:
      t["export.markdown.original.desc"] || "Keeps the content exactly as it is in the editor.",
    markdown_formatted:
      t["export.markdown.formatted.desc"] ||
      "Standardizes spacing, lists, and headings while preserving protected blocks.",
    markdown_minified:
      t["export.markdown.minified.desc"] ||
      "Removes blank lines and extra whitespace while preserving protected blocks.",
    pdf: t["export.pdf.desc"] || "Uses system printing to generate a PDF from the current preview.",
    html: t["export.html.desc"] || "Generates HTML with the active publication preset.",
  };

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
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition ${
                selectedFormat === format
                  ? "ml-btn-active"
                  : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/10`
              }`}
              onClick={() => setSelectedFormat(format)}
            >
              <span className="block font-medium">{labels[format]}</span>
              <span className="mt-1 block text-xs leading-relaxed opacity-70">{descriptions[format]}</span>
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
