import React, { useMemo, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Snippet, ThemeConfig } from "../../types";

interface SnippetManagerModalProps {
  open: boolean;
  snippets: Snippet[];
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onClose: () => void;
  onInsert: (snippet: Snippet) => void;
  onChange: (snippets: Snippet[]) => void;
}

function normalizeSnippetKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

const createEmptySnippet = (): Snippet => ({
  id: crypto.randomUUID(),
  name: "Snippet",
  category: "general",
  trigger: "novo_snippet",
  icon: "SN",
  content: "",
});

const SnippetManagerModal: React.FC<SnippetManagerModalProps> = ({
  open,
  snippets,
  t,
  tConfig,
  onClose,
  onInsert,
  onChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set(snippets.map((snippet) => snippet.category || "general"));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [snippets]);

  const filteredSnippets = useMemo(() => {
    if (categoryFilter === "all") return snippets;
    return snippets.filter((snippet) => snippet.category === categoryFilter);
  }, [categoryFilter, snippets]);

  const editingSnippet = useMemo(
    () => snippets.find((item) => item.id === editingId) ?? filteredSnippets[0] ?? null,
    [editingId, filteredSnippets, snippets]
  );

  if (!open) return null;

  const updateSnippet = (id: string, patch: Partial<Snippet>) => {
    onChange(snippets.map((snippet) => (snippet.id === id ? { ...snippet, ...patch } : snippet)));
  };

  return (
    <div className="fixed inset-0 z-[125] bg-black/45 flex items-center justify-center" onClick={onClose}>
      <div
        className={`w-[860px] max-w-[95vw] h-[82vh] rounded-xl border shadow-2xl ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg} grid grid-cols-[320px_1fr]`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`border-r ${tConfig.uiBorder} flex flex-col`}>
          <div className={`px-3 py-3 border-b ${tConfig.uiBorder} flex justify-between items-center`}>
            <div className="text-sm font-semibold">{t["snippets.title"] || "Snippets"}</div>
            <button
              className="p-1 rounded ml-btn"
              onClick={() => {
                const next = [...snippets, createEmptySnippet()];
                onChange(next);
                setEditingId(next[next.length - 1].id);
              }}
              title={t["snippets.add"] || "Add"}
              type="button"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className={`px-3 py-2 border-b ${tConfig.uiBorder}`}>
            <label className="text-xs font-semibold uppercase tracking-wide">Categoria</label>
            <select
              className={`mt-1 w-full px-2 py-1.5 rounded border text-xs bg-transparent ${tConfig.uiBorder}`}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category} className="text-black">
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {filteredSnippets.map((snippet) => (
              <button
                key={snippet.id}
                className={`w-full text-left px-2 py-2 rounded border text-xs ${editingSnippet?.id === snippet.id
                    ? "ml-btn-active"
                    : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/10`
                  }`}
                onClick={() => setEditingId(snippet.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold truncate">{snippet.name}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tConfig.uiBorder}`}>
                    {snippet.category}
                  </span>
                </div>
                <div className="truncate mt-1">{`>snip:${snippet.trigger}`}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <div className={`px-3 py-3 border-b ${tConfig.uiBorder} flex justify-between items-center`}>
            <div className="text-sm font-semibold">{t["snippets.edit"] || "Edit snippet"}</div>
            <button className="p-1 rounded ml-btn" onClick={onClose} type="button">
              <X size={14} />
            </button>
          </div>

          {!editingSnippet && <div className="p-4 text-xs">{t["snippets.tip"] || "Select a snippet"}</div>}

          {editingSnippet && (
            <div className="p-4 flex-1 overflow-auto space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">Name</span>
                  <input
                    className={`w-full px-3 py-2 rounded border text-sm bg-transparent ${tConfig.uiBorder}`}
                    value={editingSnippet.name}
                    onChange={(event) => updateSnippet(editingSnippet.id, { name: event.target.value })}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">Category</span>
                  <input
                    className={`w-full px-3 py-2 rounded border text-sm bg-transparent ${tConfig.uiBorder}`}
                    value={editingSnippet.category}
                    onChange={(event) =>
                      updateSnippet(editingSnippet.id, { category: normalizeSnippetKey(event.target.value) || "general" })
                    }
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold uppercase tracking-wide">Trigger</span>
                <input
                  className={`w-full px-3 py-2 rounded border text-sm bg-transparent font-mono ${tConfig.uiBorder}`}
                  value={editingSnippet.trigger}
                  onChange={(event) =>
                    updateSnippet(editingSnippet.id, {
                      trigger: normalizeSnippetKey(event.target.value) || "snippet",
                    })
                  }
                />
                <span className="text-[11px] font-mono">{`Use: >snip:${editingSnippet.trigger}`}</span>
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold uppercase tracking-wide">Content</span>
                <textarea
                  className={`w-full min-h-[250px] px-3 py-2 rounded border text-sm bg-transparent font-mono ${tConfig.uiBorder}`}
                  value={editingSnippet.content}
                  onChange={(event) => updateSnippet(editingSnippet.id, { content: event.target.value })}
                />
              </label>

              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded text-xs inline-flex items-center gap-1 ml-btn-primary" onClick={() => onInsert(editingSnippet)} type="button">
                  <Save size={12} />
                  Insert
                </button>
                <button
                  className="px-3 py-1.5 rounded text-xs inline-flex items-center gap-1 ml-btn-danger"
                  onClick={() => {
                    const next = snippets.filter((item) => item.id !== editingSnippet.id);
                    onChange(next);
                    setEditingId(next[0]?.id ?? null);
                  }}
                  type="button"
                >
                  <Trash2 size={12} />
                  {t["snippets.delete"] || "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnippetManagerModal;
