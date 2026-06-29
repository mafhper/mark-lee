import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Save, Trash2, X } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import { copyImageToDocumentDir, loadImage, openFileDialog } from "../../../services/filesystem";
import type { BlogViewConfig } from "../domain/journal.types";
import { setBlogView } from "../domain/manifest-service";

interface BlogSettingsDialogProps {
  open: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  journalRootPath: string;
  journalName: string;
  value?: BlogViewConfig | null;
  onClose: () => void;
  onSaved: (config: BlogViewConfig) => void;
}

const THEMES: BlogViewConfig["theme"][] = ["clean", "paper", "magazine", "notebook"];

function defaultBlogView(journalName: string): BlogViewConfig {
  return {
    version: 1,
    title: journalName,
    subtitle: "",
    theme: "clean",
    menu: [],
    showMeta: true,
    showLogo: true,
  };
}

function serializeMenu(menu: BlogViewConfig["menu"]): string {
  return menu.map((item) => `${item.label} | ${item.href}`).join("\n");
}

function parseMenu(raw: string): BlogViewConfig["menu"] {
  return raw.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|");
      return { label: label.trim(), href: rest.join("|").trim() };
    })
    .filter((item) => item.label && item.href);
}

export function BlogSettingsDialog({
  open, t, tConfig, journalRootPath, journalName, value, onClose, onSaved,
}: BlogSettingsDialogProps) {
  const [config, setConfig] = useState<BlogViewConfig>(() => value ?? defaultBlogView(journalName));
  const [menuText, setMenuText] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const inputClass = "w-full rounded border bg-transparent px-2.5 py-1.5 text-sm outline-none";

  useEffect(() => {
    if (!open) return;
    const next = value ?? defaultBlogView(journalName);
    setConfig(next);
    setMenuText(serializeMenu(next.menu ?? []));
    setSaving(false);
  }, [journalName, open, value]);

  useEffect(() => {
    let active = true;
    if (!open || !config.logo) {
      setLogoUrl(null);
      return () => { active = false; };
    }
    loadImage(`${journalRootPath}/${config.logo}`)
      .then((url) => { if (active) setLogoUrl(url); })
      .catch(() => { if (active) setLogoUrl(null); });
    return () => { active = false; };
  }, [config.logo, journalRootPath, open]);

  const themeLabel = useMemo(() => ({
    clean: t["blog.themeClean"] || "Clean",
    paper: t["blog.themePaper"] || "Paper",
    magazine: t["blog.themeMagazine"] || "Magazine",
    notebook: t["blog.themeNotebook"] || "Notebook",
  }), [t]);

  const chooseLogo = async () => {
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
    });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    const relativeToMarklee = await copyImageToDocumentDir(path, `${journalRootPath}/.marklee/journal.json`);
    setConfig((prev) => ({ ...prev, logo: `.marklee/${relativeToMarklee}`, showLogo: true }));
  };

  const handleSave = async () => {
    setSaving(true);
    const next: BlogViewConfig = {
      ...config,
      version: 1,
      title: config.title?.trim() || journalName,
      subtitle: config.subtitle?.trim() || undefined,
      menu: parseMenu(menuText),
      showMeta: config.showMeta !== false,
      showLogo: config.showLogo !== false,
    };
    try {
      await setBlogView(journalRootPath, next);
      onSaved(next);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-[620px] max-w-[94vw] flex-col rounded-xl border shadow-2xl"
        style={{ backgroundColor: tConfig.bgHex, borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: tConfig.uiBorderHex }}>
          <div>
            <h3 className="text-sm font-semibold">{t["blog.settings"] || "Blog settings"}</h3>
            <p className="text-xs" style={{ color: tConfig.fgHex + "70" }}>
              {t["blog.settingsDesc"] || "Configure the personal blog preview for this notebook."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:opacity-70" aria-label={t["journal.close"] || "Close"}>
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-20 w-20 overflow-hidden rounded-lg border flex items-center justify-center"
                style={{ borderColor: tConfig.uiBorderHex, backgroundColor: tConfig.accentHex + "0F" }}>
                {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={24} style={{ color: tConfig.accentHex }} />}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={chooseLogo} className="rounded-md px-2 py-1 text-[11px] font-medium"
                  style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
                  {t["blog.cover"] || "Capa"}
                </button>
                {config.logo && (
                  <button type="button" onClick={() => setConfig((prev) => ({ ...prev, logo: undefined }))}
                    className="rounded-md px-2 py-1 text-[11px] text-rose-400">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-medium">
                <span className="mb-1 block" style={{ color: tConfig.fgHex + "70" }}>{t["blog.title"] || "Title"}</span>
                <input className={inputClass} value={config.title ?? ""} onChange={(event) => setConfig((prev) => ({ ...prev, title: event.target.value }))}
                  style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </label>
              <label className="block text-xs font-medium">
                <span className="mb-1 block" style={{ color: tConfig.fgHex + "70" }}>{t["blog.subtitle"] || "Subtitle"}</span>
                <input className={inputClass} value={config.subtitle ?? ""} onChange={(event) => setConfig((prev) => ({ ...prev, subtitle: event.target.value }))}
                  style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium">
              <span className="mb-1 block" style={{ color: tConfig.fgHex + "70" }}>{t["blog.theme"] || "Theme"}</span>
              <select className={inputClass} value={config.theme} onChange={(event) => setConfig((prev) => ({ ...prev, theme: event.target.value as BlogViewConfig["theme"] }))}
                style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }}>
                {THEMES.map((theme) => <option key={theme} value={theme}>{themeLabel[theme]}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 pt-5">
              <label className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs"
                style={{ borderColor: tConfig.uiBorderHex }}>
                <input type="checkbox" checked={config.showMeta !== false}
                  onChange={(event) => setConfig((prev) => ({ ...prev, showMeta: event.target.checked }))}
                  style={{ accentColor: tConfig.accentHex }} />
                {t["blog.showMeta"] || "Show metadata"}
              </label>
              <label className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs"
                style={{ borderColor: tConfig.uiBorderHex }}>
                <input type="checkbox" checked={config.showLogo !== false}
                  onChange={(event) => setConfig((prev) => ({ ...prev, showLogo: event.target.checked }))}
                  style={{ accentColor: tConfig.accentHex }} />
                {t["blog.showCover"] || "Mostrar capa"}
              </label>
            </div>
          </div>

          <label className="block text-xs font-medium">
            <span className="mb-1 block" style={{ color: tConfig.fgHex + "70" }}>{t["blog.menu"] || "Menu links"}</span>
            <textarea className={`${inputClass} min-h-[96px] resize-y font-mono text-xs`} value={menuText}
              onChange={(event) => setMenuText(event.target.value)}
              placeholder={"Home | https://example.com\nArquivo | #archive"}
              style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex }} />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: tConfig.uiBorderHex }}>
          <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: tConfig.uiBorderHex, color: tConfig.fgHex + "85" }}>
            {t["journal.cancel"] || "Cancel"}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
            <Save size={12} />{saving ? (t["journal.saving"] || "Saving") : (t["journal.save"] || "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
