import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Sparkles, Wrench } from "lucide-react";
import { ThemeConfig } from "../../types";

export interface CommandPaletteItem {
  id: string;
  label: string;
  subtitle?: string;
  section: string;
  keywords?: string;
  hint?: string;
  kind?: "action" | "file" | "snippet";
  onSelect: () => void | Promise<void>;
}

interface CommandPaletteModalProps {
  open: boolean;
  items: CommandPaletteItem[];
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onClose: () => void;
}

const iconFor = (kind: CommandPaletteItem["kind"]) => {
  if (kind === "file") return <FileText size={14} />;
  if (kind === "snippet") return <Sparkles size={14} />;
  return <Wrench size={14} />;
};

const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  open,
  items,
  t,
  tConfig,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filteredItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const haystack = [item.label, item.subtitle, item.keywords, item.section]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [deferredQuery, items]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, CommandPaletteItem[]>();
    for (const item of filteredItems) {
      const current = groups.get(item.section) ?? [];
      current.push(item);
      groups.set(item.section, current);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(filteredItems.length > 0 ? filteredItems.length - 1 : 0);
    }
  }, [filteredItems.length, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((previous) =>
          filteredItems.length === 0 ? 0 : Math.min(filteredItems.length - 1, previous + 1)
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((previous) =>
          filteredItems.length === 0 ? 0 : Math.max(0, previous - 1)
        );
        return;
      }
      if (event.key === "Enter") {
        const next = filteredItems[selectedIndex];
        if (!next) return;
        event.preventDefault();
        Promise.resolve(next.onSelect()).finally(onClose);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filteredItems, onClose, open, selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[190] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={onClose}>
      <div
        className={`w-[min(720px,100%)] max-h-[72vh] overflow-hidden rounded-2xl border shadow-2xl ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`border-b px-4 py-3 ${tConfig.uiBorder}`}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
            {t["palette.title"] || "Command Palette"}
          </div>
          <input
            ref={inputRef}
            className={`w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none ${tConfig.uiBorder}`}
            placeholder={t["palette.placeholder"] || "Search commands, files, and snippets..."}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>

        <div className="ml-scrollbar max-h-[calc(72vh-96px)] overflow-y-auto p-3">
          {groupedItems.length === 0 && (
            <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm opacity-75">
              {t["palette.empty"] || "No results found."}
            </div>
          )}

          {groupedItems.map(([section, sectionItems]) => (
            <div key={section} className="mb-4 last:mb-0">
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-65">
                {section}
              </div>
              <div className="space-y-1">
                {sectionItems.map((item) => {
                  flatIndex += 1;
                  const itemIndex = flatIndex;
                  const selected = itemIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[itemIndex] = el;
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        selected ? "ml-btn-active" : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/10`
                      }`}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      onClick={() => {
                        Promise.resolve(item.onSelect()).finally(onClose);
                      }}
                      type="button"
                    >
                      <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/15 opacity-80">
                        {iconFor(item.kind)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{item.label}</div>
                        {item.subtitle && (
                          <div className="mt-1 truncate text-xs opacity-70">{item.subtitle}</div>
                        )}
                      </div>
                      {item.hint && (
                        <div className="shrink-0 rounded-md border border-current/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                          {item.hint}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPaletteModal;
