import React, { useMemo } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { THEMES } from "../../constants";
import { AppSettings, Language, PublicationPreset, Theme, ThemeConfig } from "../../types";

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  publicationPresets: PublicationPreset[];
  onClose: () => void;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onPublicationPresetsChange: (presets: PublicationPreset[]) => void;
}

const languages: { code: Language; label: string }[] = [
  { code: "pt-BR", label: "Portugues (Brasil)" },
  { code: "en-US", label: "English (US)" },
  { code: "es-ES", label: "Espanol" },
];

const themeLabels: Record<Theme, string> = {
  [Theme.Coffee]: "Coffee",
  [Theme.Dark]: "Dark",
  [Theme.Firenight]: "Firenight",
  [Theme.Forest]: "Forest",
  [Theme.Golden]: "Golden",
  [Theme.Light]: "Light",
  [Theme.Midnight]: "Midnight",
  [Theme.Neomatrix]: "Neomatrix",
  [Theme.Nord]: "Nord",
  [Theme.Sepia]: "Sepia",
  [Theme.Synthwave]: "Synthwave",
  [Theme.Terminal]: "Terminal",
};

const toolbarSections: Array<{
  key: keyof AppSettings["toolbarSections"];
  labelKey: string;
  fallback: string;
}> = [
    { key: "files", labelKey: "toolbar.files", fallback: "Files" },
    { key: "editing", labelKey: "toolbar.editing", fallback: "Editing" },
    { key: "system", labelKey: "toolbar.system", fallback: "System" },
  ];

const toolbarItemsBySection: Array<{
  section: keyof AppSettings["toolbarSections"];
  items: Array<{ key: keyof AppSettings["toolbarItems"]; labelKey: string; fallback: string }>;
}> = [
    {
      section: "files",
      items: [
        { key: "fileNew", labelKey: "file.new", fallback: "New file" },
        { key: "fileOpen", labelKey: "file.open", fallback: "Open file" },
        { key: "fileOpenFolder", labelKey: "file.openFolder", fallback: "Open folder" },
        { key: "fileSave", labelKey: "file.save", fallback: "Save" },
        { key: "fileExport", labelKey: "file.export", fallback: "Export" },
      ],
    },
    {
      section: "editing",
      items: [
        { key: "editBold", labelKey: "tool.bold", fallback: "Bold" },
        { key: "editItalic", labelKey: "tool.italic", fallback: "Italic" },
        { key: "editCode", labelKey: "tool.code", fallback: "Code" },
        { key: "editLink", labelKey: "tool.link", fallback: "Link" },
        { key: "editImage", labelKey: "tool.image", fallback: "Image" },
        { key: "editUL", labelKey: "tool.ul", fallback: "UL" },
        { key: "editOL", labelKey: "tool.ol", fallback: "OL" },
        { key: "editTask", labelKey: "tool.task", fallback: "Task" },
      ],
    },
    {
      section: "system",
      items: [
        { key: "sysFind", labelKey: "edit.find", fallback: "Find" },
        { key: "sysSnippets", labelKey: "edit.snippets", fallback: "Snippets" },
        { key: "sysTheme", labelKey: "toolbar.theme", fallback: "Theme" },
        { key: "sysSidebar", labelKey: "view.sidebar", fallback: "Sidebar" },
        { key: "sysEdit", labelKey: "view.editor", fallback: "Edit" },
        { key: "sysSplit", labelKey: "view.split", fallback: "Split" },
        { key: "sysPreview", labelKey: "view.preview", fallback: "Preview" },
        { key: "sysZen", labelKey: "view.zen", fallback: "Zen" },
        { key: "sysSettings", labelKey: "settings", fallback: "Settings" },
      ],
    },
  ];

const behaviorToggles: Array<{
  key: keyof Pick<
    AppSettings,
    "tabsEnabled" | "sidebarEnabled" | "singleInstance" | "wordWrap" | "spellCheck" | "autoSave"
  >;
  labelKey: string;
  fallback: string;
}> = [
    { key: "tabsEnabled", labelKey: "settings.tabs", fallback: "Tabs" },
    { key: "sidebarEnabled", labelKey: "settings.sidebar", fallback: "Sidebar" },
    { key: "singleInstance", labelKey: "settings.singleInstance", fallback: "Single window" },
    { key: "wordWrap", labelKey: "settings.wordWrap", fallback: "Word wrap" },
    { key: "spellCheck", labelKey: "settings.spellCheck", fallback: "Spell check" },
    { key: "autoSave", labelKey: "settings.autoSave", fallback: "Auto save" },
  ];

function isColor(value: string) {
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ||
    /^rgb(a)?\(/i.test(value) ||
    /^hsl(a)?\(/i.test(value)
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const expanded =
    normalized.length === 3
      ? normalized
        .split("")
        .map((part) => `${part}${part}`)
        .join("")
      : normalized;
  const intValue = Number.parseInt(expanded, 16);
  if (Number.isNaN(intValue)) return null;
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function luminance(rgb: { r: number; g: number; b: number }) {
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(hexA: string, hexB: string) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 0;
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  settings,
  t,
  tConfig,
  publicationPresets,
  onClose,
  onSettingsChange,
  onPublicationPresetsChange,
}) => {
  const sortedThemes = useMemo(
    () =>
      Object.values(Theme).slice().sort((a, b) => {
        return themeLabels[a].localeCompare(themeLabels[b], "en", { sensitivity: "base" });
      }),
    []
  );

  if (!open) return null;

  const toggleAccordion = (section: string) => {
    onSettingsChange({
      accordionState: {
        ...settings.accordionState,
        [section]: !settings.accordionState[section],
      },
    });
  };

  const accordionHeader = (section: string, label: string) => {
    const openState = settings.accordionState[section] ?? false;
    const Icon = openState ? ChevronDown : ChevronRight;
    return (
      <button
        className={`w-full px-4 py-3 border-b ${tConfig.uiBorder} flex items-center gap-2 text-left`}
        onClick={() => toggleAccordion(section)}
        type="button"
      >
        <Icon size={14} />
        <span className="text-sm font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/45 flex items-center justify-center" onClick={onClose}>
      <div
        className={`w-[980px] max-w-[96vw] max-h-[90vh] rounded-xl overflow-hidden border shadow-2xl ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`px-4 py-3 border-b ${tConfig.uiBorder} flex justify-between items-center`}>
          <h2 className="text-sm font-semibold">{t["settings.title"] || "Settings"}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" type="button">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-52px)]">
          <section>
            {accordionHeader("interface", t["settings.accordion.interface"] || "Interface")}
            {settings.accordionState.interface && (
              <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide">{t["settings.language"] || "Language"}</label>
                  <select
                    value={settings.language}
                    className={`w-full px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                    onChange={(event) => onSettingsChange({ language: event.target.value as Language })}
                  >
                    {languages.map((language) => (
                      <option key={language.code} value={language.code} className="text-black">
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide">{t["settings.floatingAnchor"] || "Toolbar anchor"}</label>
                  <select
                    value={settings.floatingToolbarAnchor}
                    className={`w-full px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                    onChange={(event) =>
                      onSettingsChange({
                        floatingToolbarAnchor: event.target.value as AppSettings["floatingToolbarAnchor"],
                      })
                    }
                  >
                    <option value="top" className="text-black">
                      Top
                    </option>
                    <option value="bottom" className="text-black">
                      Bottom
                    </option>
                    <option value="left" className="text-black">
                      Left
                    </option>
                    <option value="right" className="text-black">
                      Right
                    </option>
                  </select>
                </div>
              </div>
            )}
          </section>

          <section>
            {accordionHeader("themes", t["settings.themes"] || "Themes")}
            {settings.accordionState.themes && (
              <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedThemes.map((theme) => {
                  const config = THEMES[theme];
                  const surfaceContrast = contrastRatio(config.fgHex, config.bgHex);
                  const uiContrast = contrastRatio(config.fgHex, config.uiHex);
                  const editorContrast = contrastRatio(config.editorFgHex, config.editorBgHex);
                  const minContrast = Math.min(surfaceContrast, uiContrast, editorContrast);
                  const passesAA = minContrast >= 10;
                  const isSelected = settings.theme === theme;

                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => onSettingsChange({ theme })}
                      className={`text-left p-3 rounded-lg border transition-colors ${isSelected
                          ? "ml-btn-active"
                          : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/10`
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{themeLabels[theme]}</span>
                        {isSelected && <Check size={14} />}
                      </div>
                      <div className="grid grid-cols-4 gap-1 mb-2">
                        <span className="h-6 rounded border" style={{ background: config.bgHex }} />
                        <span className="h-6 rounded border" style={{ background: config.uiHex }} />
                        <span className="h-6 rounded border" style={{ background: config.editorBgHex }} />
                        <span className="h-6 rounded border" style={{ background: config.fgHex }} />
                      </div>
                      <div className="text-[11px]">
                        WCAG 2.2 text/surface: {minContrast.toFixed(2)}:1
                      </div>
                      <div className="mt-1 text-[11px]">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full border ${tConfig.uiBorder}`}
                        >
                          {passesAA ? "10:1 PASS" : "10:1 FAIL"}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px]">
                        UI: {config.uiFont.split(",")[0]} | Editor: {config.editorFont.split(",")[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            {accordionHeader("toolbar", t["settings.toolbar"] || "Toolbar")}
            {settings.accordionState.toolbar && (
              <div className="p-4 space-y-4 text-sm">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide">{t["settings.toolbar.display"] || "Labels"}</label>
                    <select
                      value={settings.toolbarDisplayMode}
                      className={`w-full max-w-[260px] px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                      onChange={(event) =>
                        onSettingsChange({
                          toolbarDisplayMode: event.target.value as AppSettings["toolbarDisplayMode"],
                        })
                      }
                    >
                      <option value="icon_text" className="text-black">
                        {t["settings.toolbar.display.iconText"] || "Icon + text"}
                      </option>
                      <option value="icon_only" className="text-black">
                        {t["settings.toolbar.display.iconOnly"] || "Icon only"}
                      </option>
                      <option value="text_only" className="text-black">
                        {t["settings.toolbar.display.textOnly"] || "Text only"}
                      </option>
                    </select>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.showToolbarSectionLabels}
                      onChange={(event) => onSettingsChange({ showToolbarSectionLabels: event.target.checked })}
                    />
                    {t["settings.toolbar.sectionLabels"] || "Show category names (Files, System, Editing)"}
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t["settings.toolbar.compactBreakpoint"] || "Compact mode width threshold"}
                    </span>
                    <input
                      type="number"
                      min={360}
                      max={900}
                      step={10}
                      value={settings.toolbarCompactBreakpoint}
                      className={`w-full max-w-[260px] px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                      onChange={(event) =>
                        onSettingsChange({
                          toolbarCompactBreakpoint: Math.max(
                            360,
                            Math.min(900, Number(event.target.value) || 560)
                          ),
                        })
                      }
                    />
                    <div className="text-[11px] opacity-75">
                      {t["settings.toolbar.compactBreakpoint.help"] || "Below this width, top/bottom toolbar hides section labels automatically."}
                    </div>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide">{t["settings.toolbar.sections"] || "Categories"}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {toolbarSections.map((section) => (
                      <label
                        key={section.key}
                        className="inline-flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={section.key === "system" ? true : settings.toolbarSections[section.key]}
                          disabled={section.key === "system"}
                          onChange={(event) =>
                            onSettingsChange({
                              toolbarSections: {
                                ...settings.toolbarSections,
                                [section.key]: section.key === "system" ? true : event.target.checked,
                              },
                            })
                          }
                        />
                        {t[section.labelKey] || section.fallback}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide">{t["settings.toolbar.items"] || "Items"}</div>
                  {toolbarItemsBySection.map((group) => (
                    <div key={group.section} className={`rounded border ${tConfig.uiBorder} p-2`}>
                      <div className="text-[11px] font-semibold mb-2 uppercase tracking-wide">
                        {t[`toolbar.${group.section}`] || group.section}
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {group.items.map((item) => (
                          <label key={item.key} className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={item.key === "sysSettings" ? true : settings.toolbarItems[item.key]}
                              disabled={item.key === "sysSettings"}
                              onChange={(event) =>
                                onSettingsChange({
                                  toolbarItems: {
                                    ...settings.toolbarItems,
                                    [item.key]: item.key === "sysSettings" ? true : event.target.checked,
                                  },
                                })
                              }
                            />
                            {t[item.labelKey] || item.fallback}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            {accordionHeader("behavior", t["settings.accordion.behavior"] || "Behavior")}
            {settings.accordionState.behavior && (
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                {behaviorToggles.map((toggle) => (
                  <label key={toggle.key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings[toggle.key]}
                      onChange={(event) =>
                        onSettingsChange({
                          [toggle.key]: event.target.checked,
                        } as Partial<AppSettings>)
                      }
                    />
                    {t[toggle.labelKey] || toggle.fallback}
                  </label>
                ))}
              </div>
            )}
          </section>

          <section>
            {accordionHeader("typography", t["settings.accordion.typography"] || "Typography")}
            {settings.accordionState.typography && (
              <div className="p-4 grid grid-cols-3 gap-3 text-sm">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {t["settings.fontFamily"] || "Editor font family"}
                  </span>
                  <select
                    value={settings.fontFamily}
                    className={`w-full px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                    onChange={(event) =>
                      onSettingsChange({ fontFamily: event.target.value as AppSettings["fontFamily"] })
                    }
                  >
                    <option value="theme_default" className="text-black">
                      Theme default
                    </option>
                    <option value="mono" className="text-black">
                      Monospace (theme)
                    </option>
                    <option value="sans" className="text-black">
                      Sans
                    </option>
                    <option value="serif" className="text-black">
                      Serif
                    </option>
                    <option value="jetbrains_mono" className="text-black">
                      JetBrains Mono
                    </option>
                    <option value="fira_code" className="text-black">
                      Fira Code
                    </option>
                    <option value="cascadia_code" className="text-black">
                      Cascadia Code
                    </option>
                    <option value="ibm_plex_mono" className="text-black">
                      IBM Plex Mono
                    </option>
                    <option value="source_code_pro" className="text-black">
                      Source Code Pro
                    </option>
                    <option value="merriweather" className="text-black">
                      Merriweather
                    </option>
                    <option value="georgia" className="text-black">
                      Georgia
                    </option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">{t["settings.fontSize"] || "Font size"}</span>
                  <input
                    type="number"
                    min={10}
                    max={36}
                    className={`w-full px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                    value={settings.fontSize}
                    onChange={(event) => onSettingsChange({ fontSize: Number(event.target.value) })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">{t["settings.lineHeight"] || "Line height"}</span>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    className={`w-full px-3 py-2 rounded border bg-transparent ${tConfig.uiBorder}`}
                    value={settings.lineHeight}
                    onChange={(event) => onSettingsChange({ lineHeight: Number(event.target.value) })}
                  />
                </label>
              </div>
            )}
          </section>

          <section>
            {accordionHeader("presets", t["settings.accordion.presets"] || "Publication presets")}
            {settings.accordionState.presets && (
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide">
                    {t["settings.presets.active"] || "Active publication preset"}
                  </label>
                  <select
                    value={settings.publicationPresetId}
                    className={`w-full max-w-[320px] px-3 py-2 rounded border bg-transparent text-sm ${tConfig.uiBorder}`}
                    onChange={(event) => onSettingsChange({ publicationPresetId: event.target.value })}
                  >
                    {publicationPresets.map((preset) => (
                      <option key={preset.id} value={preset.id} className="text-black">
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {publicationPresets.map((preset) => {
                  const textContrast = contrastRatio(preset.palette.text, preset.palette.bg);
                  const accentContrast = contrastRatio(preset.palette.accent, preset.palette.bg);
                  const minPresetContrast = Math.min(textContrast, accentContrast);
                  const meetsContrast = minPresetContrast >= 10;

                  return (
                    <div key={preset.id} className={`p-3 rounded border ${tConfig.uiBorder} space-y-2`}>
                      <div className="flex gap-2">
                        <input
                          className={`flex-1 px-2 py-1 rounded border text-sm bg-transparent ${tConfig.uiBorder}`}
                          value={preset.name}
                          onChange={(event) =>
                            onPublicationPresetsChange(
                              publicationPresets.map((item) =>
                                item.id === preset.id ? { ...item, name: event.target.value } : item
                              )
                            )
                          }
                        />
                        <button
                          className={`px-2 py-1 rounded text-[11px] border ${settings.publicationPresetId === preset.id ? "ml-btn-active" : tConfig.uiBorder
                            }`}
                          onClick={() => onSettingsChange({ publicationPresetId: preset.id })}
                          type="button"
                        >
                          {settings.publicationPresetId === preset.id
                            ? t["settings.presets.activeTag"] || "Active"
                            : t["settings.presets.use"] || "Use"}
                        </button>
                        <button
                          className="p-1 rounded ml-btn-danger"
                          onClick={() =>
                            onPublicationPresetsChange(publicationPresets.filter((item) => item.id !== preset.id))
                          }
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border ${tConfig.uiBorder}`}>
                          Text/bg: {textContrast.toFixed(2)}:1
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full border ${tConfig.uiBorder}`}>
                          Accent/bg: {accentContrast.toFixed(2)}:1
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full border ${tConfig.uiBorder}`}>
                          {meetsContrast ? ">=10:1 OK" : "<10:1 Ajustar"}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(["bg", "text", "accent", "muted"] as const).map((colorKey) => (
                          <label key={colorKey} className="text-xs space-y-1">
                            <span className="font-semibold uppercase tracking-wide">{colorKey}</span>
                            <input
                              className={`w-full px-2 py-1 rounded border text-xs bg-transparent ${tConfig.uiBorder}`}
                              value={preset.palette[colorKey]}
                              onChange={(event) =>
                                onPublicationPresetsChange(
                                  publicationPresets.map((item) =>
                                    item.id === preset.id
                                      ? {
                                        ...item,
                                        palette: { ...item.palette, [colorKey]: event.target.value },
                                      }
                                      : item
                                  )
                                )
                              }
                            />
                            <span
                              className={`block h-6 rounded border ${tConfig.uiBorder}`}
                              style={{
                                backgroundColor: isColor(preset.palette[colorKey])
                                  ? preset.palette[colorKey]
                                  : "transparent",
                              }}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs space-y-1">
                          <span className="font-semibold uppercase tracking-wide">font</span>
                          <input
                            className={`w-full px-2 py-1 rounded border text-xs bg-transparent ${tConfig.uiBorder}`}
                            value={preset.typography.fontFamily}
                            onChange={(event) =>
                              onPublicationPresetsChange(
                                publicationPresets.map((item) =>
                                  item.id === preset.id
                                    ? {
                                      ...item,
                                      typography: {
                                        ...item.typography,
                                        fontFamily: event.target.value,
                                      },
                                    }
                                    : item
                                )
                              )
                            }
                          />
                        </label>
                        <label className="text-xs space-y-1">
                          <span className="font-semibold uppercase tracking-wide">line-height</span>
                          <input
                            type="number"
                            min={1.1}
                            max={2.6}
                            step={0.05}
                            className={`w-full px-2 py-1 rounded border text-xs bg-transparent ${tConfig.uiBorder}`}
                            value={preset.typography.lineHeight}
                            onChange={(event) =>
                              onPublicationPresetsChange(
                                publicationPresets.map((item) =>
                                  item.id === preset.id
                                    ? {
                                      ...item,
                                      typography: {
                                        ...item.typography,
                                        lineHeight: Number(event.target.value),
                                      },
                                    }
                                    : item
                                )
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
                <button
                  className="px-3 py-1.5 rounded text-xs border hover:bg-black/5 dark:hover:bg-white/10 inline-flex items-center gap-2"
                  onClick={() =>
                    onPublicationPresetsChange([
                      ...publicationPresets,
                      {
                        id: crypto.randomUUID(),
                        name: "Custom Preset",
                        description: "Custom publication preset",
                        palette: {
                          bg: "#f8fafc",
                          text: "#111827",
                          accent: "#172554",
                          muted: "#334155",
                        },
                        typography: {
                          fontFamily: "'Source Sans 3', sans-serif",
                          lineHeight: 1.7,
                        },
                      },
                    ])
                  }
                  type="button"
                >
                  <Plus size={14} />
                  {t["settings.presets.add"] || "Add preset"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
