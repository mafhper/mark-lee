import { useEffect, useState } from "react";
import { X, ImagePlus, Trash2, Check, Plus, ArrowUp, ArrowDown } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalMediaSettings } from "../../../types";
import type { EntryFieldDefinition, EntryFieldType, JournalDescriptor } from "../domain/journal.types";
import { DEFAULT_ENTRY_FIELD_DEFINITIONS, readManifest, setEntryFieldDefinitions, updateJournalAppearance } from "../domain/manifest-service";
import { openFileDialog } from "../../../services/filesystem";
import { importJournalImage } from "../../../services/journal-media";
import { JournalImageLibraryDialog, type JournalLibraryImage } from "./JournalImageLibraryDialog";

interface CustomizeJournalDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journal: JournalDescriptor | null;
  journalMedia: JournalMediaSettings;
  onClose: () => void;
  onSaved: () => void;
}

const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#84cc16",
];

const FIELD_TYPES: EntryFieldType[] = ["url", "text", "date", "number"];

function slugifyFieldId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `campo-${Date.now()}`;
}

export function CustomizeJournalDialog({ open, t, tConfig, journal, journalMedia, onClose, onSaved }: CustomizeJournalDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldDefs, setFieldDefs] = useState<EntryFieldDefinition[]>(DEFAULT_ENTRY_FIELD_DEFINITIONS.items);
  const [showCoverLibrary, setShowCoverLibrary] = useState(false);

  useEffect(() => {
    if (!journal || !open) return;
    setName(journal.name);
    setDescription(journal.description ?? "");
    setError("");
    setBusy(false);
    readManifest(journal.rootPath)
      .then((manifest) => setFieldDefs(manifest?.entryFieldDefinitions?.items ?? DEFAULT_ENTRY_FIELD_DEFINITIONS.items))
      .catch(() => setFieldDefs(DEFAULT_ENTRY_FIELD_DEFINITIONS.items));
  }, [journal, open]);

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

  const importCoverPath = (path: string) =>
    apply(async () => {
      const fileName = await importJournalImage(path, `${journal.rootPath}/.marklee/cover`, journalMedia);
      await updateJournalAppearance(journal.rootPath, { cover: `.marklee/${fileName}` });
    });

  const handlePickCoverFromComputer = async () => {
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }],
    });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    await importCoverPath(path);
  };

  const handlePickCover = () => setShowCoverLibrary(true);

  const handleCoverFromLibrary = (images: JournalLibraryImage[]) => {
    const image = images[0];
    if (image) void importCoverPath(image.path);
  };

  /*
   * The Windows picker is intentionally the fallback: when the caderno already
   * owns media, the user sees that reusable library before importing a duplicate.
   */
  const handleEmptyCoverLibrary = () => {
    void handlePickCoverFromComputer();
  };

  const handleRemoveCover = () =>
    apply(() => updateJournalAppearance(journal.rootPath, { cover: null }));

  const handleSaveDetails = () =>
    apply(() => updateJournalAppearance(journal.rootPath, {
      name,
      description: description.trim() ? description : null,
    }));

  const normalizeFields = (items: EntryFieldDefinition[]) =>
    items.map((field, order) => ({ ...field, order }));

  const handleAddField = () => {
    const label = `${t["journal.newField"] || "Campo"} ${fieldDefs.length + 1}`;
    const idBase = slugifyFieldId(label);
    const existing = new Set(fieldDefs.map((field) => field.id));
    let id = idBase;
    let suffix = 2;
    while (existing.has(id)) {
      id = `${idBase}-${suffix++}`;
    }
    setFieldDefs(normalizeFields([
      ...fieldDefs,
      {
        id,
        label,
        type: "text",
        visibleInHeader: true,
        visibleInPublication: true,
        order: fieldDefs.length,
      },
    ]));
  };

  const handleFieldPatch = (id: string, patch: Partial<EntryFieldDefinition>) => {
    setFieldDefs((current) => normalizeFields(current.map((field) => {
      if (field.id !== id) return field;
      return { ...field, ...patch };
    })));
  };

  const handleMoveField = (id: string, direction: -1 | 1) => {
    const index = fieldDefs.findIndex((field) => field.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= fieldDefs.length) return;
    const next = [...fieldDefs];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setFieldDefs(normalizeFields(next));
  };

  const handleRemoveField = (id: string) => {
    setFieldDefs(normalizeFields(fieldDefs.filter((field) => field.id !== id)));
  };

  const handleSaveFields = () =>
    apply(() => setEntryFieldDefinitions(journal.rootPath, {
      version: 1,
      items: normalizeFields(fieldDefs.filter((field) => field.id.trim() && field.label.trim())),
    }));

  return (
    <>
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
          <div className="rounded-lg border p-3" style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "08" }}>
            <div className="grid gap-3">
              <label className="block text-xs font-medium" style={{ color: tConfig.fgHex + "90" }}>
                <span className="mb-1 block">{t["journal.notebookName"] || "Nome do caderno"}</span>
                <input value={name} onChange={(event) => setName(event.target.value)}
                  className="w-full rounded border bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </label>
              <label className="block text-xs font-medium" style={{ color: tConfig.fgHex + "90" }}>
                <span className="mb-1 block">{t["journal.description"] || "Subtitulo"}</span>
                <input value={description} onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded border bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </label>
              <div className="flex justify-end">
                <button type="button" disabled={busy || !name.trim()} onClick={handleSaveDetails}
                  className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
                  {t["journal.save"] || "Salvar"}
                </button>
              </div>
            </div>
          </div>

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
              {t["journal.notebookCover"] || t["journal.cover"] || "Cover"}
            </label>
            <div className="flex items-center gap-2">
              <button type="button" disabled={busy} onClick={handlePickCover}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors disabled:opacity-40"
                style={{ color: tConfig.accentHex, borderColor: tConfig.accentHex + "40", backgroundColor: tConfig.accentHex + "10" }}>
                <ImagePlus size={13} /> {journal.cover ? (t["journal.changeCover"] || "Change cover") : (t["journal.notebookCoverChoose"] || "Choose image")}
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

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-medium" style={{ color: tConfig.fgHex + "90" }}>
                  {t["journal.entryFields"] || "Campos das memórias"}
                </label>
                <p className="text-[11px]" style={{ color: tConfig.fgHex + "60" }}>
                  {t["journal.entryFieldsDesc"] || "Configure campos curtos exibidos no cabeçalho e na publicação."}
                </p>
              </div>
              <button type="button" disabled={busy} onClick={handleAddField}
                className="h-7 w-7 rounded border flex items-center justify-center disabled:opacity-40"
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.accentHex }}
                title={t["journal.addField"] || "Adicionar campo"}>
                <Plus size={13} />
              </button>
            </div>
            <div className="space-y-2">
              {fieldDefs.map((field, index) => (
                <div key={field.id} className="rounded border p-2"
                  style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "05" }}>
                  <div className="grid grid-cols-[minmax(0,1fr)_92px_auto] gap-2">
                    <input value={field.label}
                      onChange={(event) => handleFieldPatch(field.id, { label: event.target.value })}
                      className="rounded border bg-transparent px-2 py-1 text-xs outline-none"
                      style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }}
                      placeholder={t["journal.fieldLabel"] || "Rótulo"} />
                    <select value={field.type}
                      onChange={(event) => handleFieldPatch(field.id, { type: event.target.value as EntryFieldType })}
                      className="rounded border bg-transparent px-2 py-1 text-xs outline-none"
                      style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }}>
                      {FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleMoveField(field.id, -1)} disabled={index === 0 || busy}
                        className="h-7 w-7 rounded border disabled:opacity-35"
                        style={{ borderColor: tConfig.uiBorderHex }} title={t["journal.moveUp"] || "Mover para cima"}>
                        <ArrowUp size={12} className="m-auto" />
                      </button>
                      <button type="button" onClick={() => handleMoveField(field.id, 1)} disabled={index === fieldDefs.length - 1 || busy}
                        className="h-7 w-7 rounded border disabled:opacity-35"
                        style={{ borderColor: tConfig.uiBorderHex }} title={t["journal.moveDown"] || "Mover para baixo"}>
                        <ArrowDown size={12} className="m-auto" />
                      </button>
                      <button type="button" onClick={() => handleRemoveField(field.id)} disabled={busy || fieldDefs.length <= 1}
                        className="h-7 w-7 rounded border text-rose-500 disabled:opacity-35"
                        style={{ borderColor: tConfig.uiBorderHex }} title={t["journal.delete"] || "Remover"}>
                        <Trash2 size={12} className="m-auto" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center gap-1.5" style={{ color: tConfig.fgHex + "75" }}>
                      <input type="checkbox" checked={field.visibleInHeader}
                        onChange={(event) => handleFieldPatch(field.id, { visibleInHeader: event.target.checked })}
                        style={{ accentColor: tConfig.accentHex }} />
                      {t["journal.showInHeader"] || "Cabeçalho"}
                    </label>
                    <label className="flex items-center gap-1.5" style={{ color: tConfig.fgHex + "75" }}>
                      <input type="checkbox" checked={field.visibleInPublication}
                        onChange={(event) => handleFieldPatch(field.id, { visibleInPublication: event.target.checked })}
                        style={{ accentColor: tConfig.accentHex }} />
                      {t["journal.showInPublication"] || "Publicação"}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <button type="button" disabled={busy || fieldDefs.length === 0} onClick={handleSaveFields}
                className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
                {t["journal.saveFields"] || "Salvar campos"}
              </button>
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
    <JournalImageLibraryDialog
      open={showCoverLibrary}
      t={t}
      tConfig={tConfig}
      journalRootPath={journal.rootPath}
      onClose={() => setShowCoverLibrary(false)}
      onSelect={handleCoverFromLibrary}
      onEmpty={handleEmptyCoverLibrary}
    />
    </>
  );
}
