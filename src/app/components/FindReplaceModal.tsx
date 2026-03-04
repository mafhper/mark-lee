import React, { useEffect, useMemo, useState } from "react";
import { ThemeConfig } from "../../types";

export interface FindResult {
  index: number;
  length: number;
  line: number;
  preview: string;
}

interface FindReplaceModalProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  content: string;
  options: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  };
  onClose: () => void;
  onOptionsChange: (options: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  }) => void;
  onSelectResult: (result: FindResult) => void;
  onReplaceOne: (query: string, replacement: string, options: FindReplaceModalProps["options"]) => void;
  onReplaceAll: (query: string, replacement: string, options: FindReplaceModalProps["options"]) => void;
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegExp(
  query: string,
  options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }
) {
  if (!query) return null;
  const source = options.useRegex ? query : escapeRegex(query);
  const wrapped = options.wholeWord ? `\\b${source}\\b` : source;
  try {
    return new RegExp(wrapped, options.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  open,
  t,
  tConfig,
  content,
  options,
  onClose,
  onOptionsChange,
  onSelectResult,
  onReplaceOne,
  onReplaceAll,
}) => {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");

  const results = useMemo(() => {
    const regex = buildRegExp(query, options);
    if (!regex) return [];
    const found: FindResult[] = [];
    for (const match of content.matchAll(regex)) {
      const index = match.index ?? 0;
      const line = content.substring(0, index).split("\n").length;
      const previewStart = Math.max(0, index - 24);
      const previewEnd = Math.min(content.length, index + (match[0]?.length || 0) + 36);
      found.push({
        index,
        length: match[0]?.length ?? 0,
        line,
        preview: content.substring(previewStart, previewEnd).replace(/\n/g, " "),
      });
      if (found.length >= 300) break;
    }
    return found;
  }, [content, options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setReplacement("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div
        className={`w-[760px] max-w-[94vw] max-h-[85vh] overflow-hidden rounded-xl border shadow-2xl ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`px-4 py-3 border-b ${tConfig.uiBorder} text-sm font-semibold`}>
          {t["edit.find"] || "Find"} / {t["edit.replace"] || "Replace"}
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <input
            className={`px-3 py-2 rounded-md border text-sm bg-transparent ${tConfig.uiBorder}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t["find.placeholder"] || "Find..."}
          />
          <input
            className={`px-3 py-2 rounded-md border text-sm bg-transparent ${tConfig.uiBorder}`}
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            placeholder={t["find.replace"] || "Replace with..."}
          />
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.caseSensitive}
              onChange={(event) =>
                onOptionsChange({ ...options, caseSensitive: event.target.checked })
              }
            />
            {t["find.caseSensitive"] || "Case sensitive"}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.wholeWord}
              onChange={(event) => onOptionsChange({ ...options, wholeWord: event.target.checked })}
            />
            {t["find.wholeWord"] || "Whole word"}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.useRegex}
              onChange={(event) => onOptionsChange({ ...options, useRegex: event.target.checked })}
            />
            {t["find.regex"] || "Regex"}
          </label>
          <div className="ml-auto text-xs font-semibold">
            {(t["find.results"] || "Occurrences") + `: ${results.length}`}
          </div>
        </div>
        <div className={`border-t ${tConfig.uiBorder} p-3 flex gap-2`}>
          <button
            className="px-3 py-1.5 rounded text-xs border ml-btn"
            onClick={() => onReplaceOne(query, replacement, options)}
          >
            {t["find.replaceOne"] || "Replace"}
          </button>
          <button
            className="px-3 py-1.5 rounded text-xs ml-btn-primary"
            onClick={() => onReplaceAll(query, replacement, options)}
          >
            {t["find.replaceAll"] || "Replace all"}
          </button>
        </div>
        <div className={`h-[320px] overflow-auto border-t ${tConfig.uiBorder}`}>
          {results.map((result) => (
            <button
              key={`${result.index}-${result.length}`}
              className="w-full text-left px-4 py-2 border-b border-black/10 dark:border-white/10 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => onSelectResult(result)}
            >
              <div className="font-semibold">Ln {result.line}</div>
              <div className="truncate">{result.preview}</div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-5 text-xs">{t["file.noRecent"] || "No results"}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindReplaceModal;
