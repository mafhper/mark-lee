import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalTemplate } from "../domain/template-service";
import { listTemplates, saveTemplate, deleteTemplate } from "../domain/template-service";

interface TemplateManagerDialogProps {
  open: boolean;
  tConfig: ThemeConfig;
  journalRootPath: string;
  onClose: () => void;
}

export function TemplateManagerDialog({ open, tConfig, journalRootPath, onClose }: TemplateManagerDialogProps) {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBody, setEditBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEditingName(null);
    setLoading(true);
    listTemplates(journalRootPath).then((list) => {
      setTemplates(list);
      setLoading(false);
    });
  }, [open, journalRootPath]);

  const handleSave = async () => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      if (editingName && editingName !== name) {
        await deleteTemplate(journalRootPath, editingName);
      }
      await saveTemplate(journalRootPath, name, editBody);
      const list = await listTemplates(journalRootPath);
      setTemplates(list);
      setEditingName(null);
    } catch (e) {
      console.error("Failed to save template:", e);
    }
    setSaving(false);
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteTemplate(journalRootPath, name);
      setTemplates((prev) => prev.filter((t) => t.name !== name));
      if (editingName === name) setEditingName(null);
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
  };

  const handleAdd = () => {
    setEditingName(null);
    setEditName("");
    setEditBody("");
    // Small delay to let React flush previous state
    setTimeout(() => {
      setEditingName("__new__");
      setEditName("");
      setEditBody("");
    }, 0);
  };

  const handleEdit = (tpl: JournalTemplate) => {
    setEditingName(tpl.name);
    setEditName(tpl.name);
    setEditBody(tpl.body);
  };

  if (!open) return null;

  const isEditing = editingName !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-w-[90vw] max-h-[80vh] rounded-lg shadow-2xl border flex flex-col"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <h3 className="text-sm font-semibold">Manage Templates</h3>
          <button type="button" onClick={onClose} className="hover:opacity-60"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-row">
          <div className="w-1/2 border-r overflow-y-auto p-3 space-y-1"
            style={{ borderColor: tConfig.uiBorderHex }}>
            {loading ? (
              <p className="text-xs" style={{ color: tConfig.fgHex + "50" }}>Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-xs" style={{ color: tConfig.fgHex + "40" }}>
                No templates yet. Create one to reuse content across entries.
              </p>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.name}
                  className="flex items-center gap-1 p-1.5 rounded border text-xs"
                  style={{
                    borderColor: editingName === tpl.name ? tConfig.accentHex : "transparent",
                    backgroundColor: tConfig.accentHex + "06",
                  }}>
                  <button type="button" onClick={() => handleEdit(tpl)}
                    className="flex-1 min-w-0 text-left truncate px-1 py-0.5 rounded hover:opacity-70"
                    style={{ color: tConfig.fgHex }}>
                    {tpl.name}
                  </button>
                  <button type="button" onClick={() => handleDelete(tpl.name)}
                    className="p-1 rounded hover:bg-red-500/10 shrink-0" style={{ color: "#ef4444" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
            <button type="button" onClick={handleAdd}
              className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors"
              style={{ color: tConfig.accentHex }}>
              <Plus size={12} /> New template
            </button>
          </div>

          <div className="w-1/2 flex flex-col p-3 overflow-y-auto">
            {isEditing ? (
              <div className="flex flex-col gap-2 h-full">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-2 py-1 rounded border bg-transparent outline-none text-xs font-medium"
                  style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} />
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Template body (markdown)..."
                  className="flex-1 min-h-[120px] px-2 py-1 rounded border bg-transparent outline-none text-xs resize-none"
                  style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} />
                <button type="button" onClick={handleSave} disabled={saving || !editName.trim()}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded self-end"
                  style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
                  <Save size={12} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: tConfig.fgHex + "40" }}>
                Select a template to edit, or create a new one.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end px-5 py-3 border-t shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded border"
            style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>Close</button>
        </div>
      </div>
    </div>
  );
}
