import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { TrackerDefinition } from "../domain/journal.types";
import { getTrackerDefinitions, setTrackerDefinitions } from "../domain/tracker-service";

interface TrackerManagerDialogProps {
  open: boolean;
  tConfig: ThemeConfig;
  journalRootPath: string;
  onClose: () => void;
}

const TRACKER_TYPES: TrackerDefinition["type"][] = ["number", "string", "boolean"];

function emptyDef(): TrackerDefinition {
  return { id: crypto.randomUUID(), name: "", type: "number", unit: "" };
}

export function TrackerManagerDialog({ open, tConfig, journalRootPath, onClose }: TrackerManagerDialogProps) {
  const [definitions, setDefinitions] = useState<TrackerDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getTrackerDefinitions(journalRootPath).then((defs) => {
      setDefinitions(defs);
      setLoading(false);
    });
  }, [open, journalRootPath]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const valid = definitions.filter((d) => d.name.trim());
      await setTrackerDefinitions(journalRootPath, valid);
      onClose();
    } catch (e) {
      console.error("Failed to save trackers:", e);
    }
    setSaving(false);
  };

  const handleAdd = () => setDefinitions((prev) => [...prev, emptyDef()]);

  const handleRemove = (id: string) => setDefinitions((prev) => prev.filter((d) => d.id !== id));

  const handleChange = (id: string, field: keyof TrackerDefinition, value: string) => {
    setDefinitions((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] max-w-[90vw] max-h-[80vh] rounded-lg shadow-2xl border flex flex-col"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <h3 className="text-sm font-semibold">Manage Trackers</h3>
          <button type="button" onClick={onClose} className="hover:opacity-60">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-xs" style={{ color: tConfig.fgHex + "60" }}>Loading...</p>
          ) : definitions.length === 0 ? (
            <p className="text-xs" style={{ color: tConfig.fgHex + "50" }}>
              No trackers defined yet. Trackers let you log numeric, text, or boolean data per entry (e.g. water intake, sleep hours, mood score).
            </p>
          ) : (
            definitions.map((def) => (
              <div key={def.id} className="flex items-center gap-2 p-2 rounded border text-xs"
                style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "04" }}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <input type="text" value={def.name} onChange={(e) => handleChange(def.id, "name", e.target.value)}
                      placeholder="Tracker name"
                      className="flex-1 px-1.5 py-0.5 rounded bg-transparent border outline-none text-xs font-medium"
                      style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }} />
                    <select value={def.type} onChange={(e) => handleChange(def.id, "type", e.target.value)}
                      className="px-1 py-0.5 rounded bg-transparent border outline-none text-[10px]"
                      style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }}>
                      {TRACKER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={def.unit ?? ""} onChange={(e) => handleChange(def.id, "unit", e.target.value)}
                      placeholder="Unit (e.g. cups, hours, /10)"
                      className="flex-1 px-1.5 py-0.5 rounded bg-transparent border outline-none text-[10px]"
                      style={{ color: tConfig.fgHex + "70", borderColor: tConfig.uiBorderHex }} />
                    <input type="text" value={def.color ?? ""} onChange={(e) => handleChange(def.id, "color", e.target.value)}
                      placeholder="Color (e.g. #3b82f6)"
                      className="w-20 px-1.5 py-0.5 rounded bg-transparent border outline-none text-[10px]"
                      style={{ color: tConfig.fgHex + "70", borderColor: tConfig.uiBorderHex }} />
                    <button type="button" onClick={() => handleRemove(def.id)}
                      className="p-1 rounded hover:bg-red-500/10" style={{ color: "#ef4444" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={handleAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ color: tConfig.accentHex, backgroundColor: tConfig.accentHex + "18" }}>
            <Plus size={12} /> Add tracker
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded border"
              style={{ color: tConfig.fgHex + "80", borderColor: tConfig.uiBorderHex }}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded"
              style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
              <Save size={12} /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
