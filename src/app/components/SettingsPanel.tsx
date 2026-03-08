import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BetweenHorizontalStart,
  Check,
  ChevronDown,
  Command,
  CopyPlus,
  Keyboard,
  Layers3,
  Palette,
  RotateCcw,
  Settings2,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { createDefaultThemeLibrary } from "../../constants";
import { createPublicationPreset } from "../../services/publication-style";
import {
  AppSettings,
  Language,
  PublicationPreset,
  Theme,
  ThemeConfig,
  ThemeDefinition,
} from "../../types";

type SettingsTabId =
  | "general"
  | "appearance"
  | "editor"
  | "toolbar"
  | "palette"
  | "presets"
  | "shortcuts";

type SettingsPanelProps = {
  open: boolean;
  settings: AppSettings;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  publicationPresets: PublicationPreset[];
  onClose: () => void;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onPublicationPresetsChange: React.Dispatch<React.SetStateAction<PublicationPreset[]>>;
};

const tabs: Array<{ id: SettingsTabId; icon: React.ReactNode }> = [
  { id: "general", icon: <Settings2 className="h-4 w-4" /> },
  { id: "appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "editor", icon: <Type className="h-4 w-4" /> },
  { id: "toolbar", icon: <BetweenHorizontalStart className="h-4 w-4" /> },
  { id: "palette", icon: <Command className="h-4 w-4" /> },
  { id: "presets", icon: <Layers3 className="h-4 w-4" /> },
  { id: "shortcuts", icon: <Keyboard className="h-4 w-4" /> },
];

const languages: Language[] = ["pt-BR", "en-US", "es-ES"];

const shortcutActionIds = [
  "file-save",
  "file-open",
  "file-open-folder",
  "edit-find",
  "edit-snippets",
  "app-command-palette",
  "app-settings",
  "fmt-bold",
  "fmt-italic",
  "fmt-link",
] as const;

const toolbarItemsBySection: Array<{
  titleKey: "files" | "system" | "editing";
  items: Array<{ key: keyof AppSettings["toolbarItems"]; labelKey: string }>;
}> = [
  {
    titleKey: "files",
    items: [
      { key: "fileNew", labelKey: "new" },
      { key: "fileOpen", labelKey: "open" },
      { key: "fileOpenFolder", labelKey: "openFolder" },
      { key: "fileSave", labelKey: "save" },
      { key: "fileExport", labelKey: "export" },
    ],
  },
  {
    titleKey: "system",
    items: [
      { key: "sysFind", labelKey: "find" },
      { key: "sysSnippets", labelKey: "snippets" },
      { key: "sysTheme", labelKey: "theme" },
      { key: "sysSidebar", labelKey: "sidebar" },
      { key: "sysEdit", labelKey: "editor" },
      { key: "sysSplit", labelKey: "split" },
      { key: "sysPreview", labelKey: "preview" },
      { key: "sysZen", labelKey: "zen" },
      { key: "sysSettings", labelKey: "settings" },
    ],
  },
  {
    titleKey: "editing",
    items: [
      { key: "editBold", labelKey: "bold" },
      { key: "editItalic", labelKey: "italic" },
      { key: "editCode", labelKey: "code" },
      { key: "editLink", labelKey: "link" },
      { key: "editImage", labelKey: "image" },
      { key: "editUL", labelKey: "list" },
      { key: "editOL", labelKey: "orderedList" },
      { key: "editTask", labelKey: "task" },
    ],
  },
];

function normalizeHex(value: string, fallback: string) {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split("")
      .map((part) => `${part}${part}`)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toLowerCase()}`;
  }
  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, "#000000").replace("#", "");
  const intValue = Number.parseInt(normalized, 16);
  if (Number.isNaN(intValue)) return null;
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  if (l1 == null || l2 == null) return 0;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getBuiltInTheme(themeId: string) {
  return createDefaultThemeLibrary().find((theme) => theme.id === themeId) ?? null;
}

function getThemeName(theme: ThemeDefinition, t: Record<string, string>) {
  const lookupId = theme.baseThemeId ?? theme.id;
  return theme.builtIn ? t[`theme.${lookupId}`] ?? theme.name : theme.name;
}

function describeTheme(theme: ThemeDefinition) {
  const contrast = contrastRatio(theme.config.fgHex, theme.config.bgHex).toFixed(1);
  return {
    contrast,
    shellDelta: Math.abs((luminance(theme.config.bgHex) ?? 0) - (luminance(theme.config.uiHex) ?? 0)),
    accentContrast: contrastRatio(theme.config.accentHex, theme.config.bgHex).toFixed(1),
  };
}

export default function SettingsPanel({
  open,
  settings,
  t,
  tConfig,
  publicationPresets,
  onClose,
  onSettingsChange,
  onPublicationPresetsChange,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [expandedPresetIds, setExpandedPresetIds] = useState<string[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState(settings.theme);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const colorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const activePreset = useMemo(
    () => publicationPresets.find((preset) => preset.id === settings.publicationPresetId) ?? publicationPresets[0] ?? null,
    [publicationPresets, settings.publicationPresetId]
  );
  const selectedTheme = useMemo(
    () => settings.themeLibrary.find((theme) => theme.id === selectedThemeId) ?? settings.themeLibrary[0] ?? null,
    [selectedThemeId, settings.themeLibrary]
  );
  const tr = (pt: string, en: string, es: string) => {
    if (settings.language === "en-US") return en;
    if (settings.language === "es-ES") return es;
    return pt;
  };
  const tabLabels: Record<SettingsTabId, string> = {
    general: tr("Geral", "General", "General"),
    appearance: tr("Temas", "Themes", "Temas"),
    editor: tr("Editor", "Editor", "Editor"),
    toolbar: tr("Toolbar", "Toolbar", "Toolbar"),
    palette: tr("Command palette", "Command palette", "Command palette"),
    presets: tr("Publicação", "Publishing", "Publicación"),
    shortcuts: tr("Atalhos", "Shortcuts", "Atajos"),
  };
  const tabDescriptions: Record<SettingsTabId, string> = {
    general: tr(
      "Preferências centrais do app, da janela e da navegação lateral.",
      "Core app, window, and sidebar preferences.",
      "Preferencias centrales de la app, la ventana y la navegación lateral."
    ),
    appearance: tr(
      "Biblioteca de temas, edição de cores e restauração dos padrões.",
      "Theme library, color editing, and default restoration.",
      "Biblioteca de temas, edición de colores y restauración de los predeterminados."
    ),
    editor: tr(
      "Tipografia, leitura e comportamento da escrita no editor.",
      "Typography, reading, and writing behavior in the editor.",
      "Tipografía, lectura y comportamiento de escritura en el editor."
    ),
    toolbar: tr(
      "Posição, densidade e ações visíveis da barra principal.",
      "Position, density, and visible actions in the main toolbar.",
      "Posición, densidad y acciones visibles de la barra principal."
    ),
    palette: tr(
      "Fontes de busca e comportamento do command palette.",
      "Search sources and command palette behavior.",
      "Fuentes de búsqueda y comportamiento del command palette."
    ),
    presets: tr(
      "Presets que controlam preview e exportação HTML.",
      "Presets that control preview and HTML export.",
      "Presets que controlan la vista previa y la exportación HTML."
    ),
    shortcuts: tr(
      "Atalhos personalizados para as ações principais do app.",
      "Custom shortcuts for the app's main actions.",
      "Atajos personalizados para las acciones principales de la app."
    ),
  };
  const shortcutLabels: Record<(typeof shortcutActionIds)[number], string> = {
    "file-save": tr("Salvar", "Save", "Guardar"),
    "file-open": tr("Abrir arquivo", "Open file", "Abrir archivo"),
    "file-open-folder": tr("Abrir pasta", "Open folder", "Abrir carpeta"),
    "edit-find": tr("Buscar", "Find", "Buscar"),
    "edit-snippets": "Snippets",
    "app-command-palette": "Command palette",
    "app-settings": tr("Configurações", "Settings", "Configuración"),
    "fmt-bold": tr("Negrito", "Bold", "Negrita"),
    "fmt-italic": tr("Itálico", "Italic", "Cursiva"),
    "fmt-link": tr("Link", "Link", "Enlace"),
  };
  const toolbarSectionLabels: Record<"files" | "system" | "editing", string> = {
    files: t["toolbar.files"] ?? tr("Arquivos", "Files", "Archivos"),
    system: t["toolbar.system"] ?? tr("Sistema", "System", "Sistema"),
    editing: t["toolbar.editing"] ?? tr("Edição", "Editing", "Edición"),
  };
  const toolbarItemLabels: Record<string, string> = {
    new: tr("Novo", "New", "Nuevo"),
    open: tr("Abrir", "Open", "Abrir"),
    openFolder: tr("Abrir pasta", "Open folder", "Abrir carpeta"),
    save: tr("Salvar", "Save", "Guardar"),
    export: tr("Exportar", "Export", "Exportar"),
    find: tr("Buscar", "Find", "Buscar"),
    snippets: "Snippets",
    theme: t["toolbar.theme"] ?? tr("Tema", "Theme", "Tema"),
    sidebar: t["view.sidebar"] ?? "Sidebar",
    editor: t["view.editor"] ?? tr("Editor", "Editor", "Editor"),
    split: t["view.split"] ?? tr("Dividido", "Split", "Dividido"),
    preview: t["view.preview"] ?? tr("Visualização", "Preview", "Vista previa"),
    zen: t["view.zen"] ?? tr("Modo zen", "Zen mode", "Modo zen"),
    settings: t.settings ?? tr("Configurações", "Settings", "Configuración"),
    bold: t["tool.bold"] ?? tr("Negrito", "Bold", "Negrita"),
    italic: t["tool.italic"] ?? tr("Itálico", "Italic", "Cursiva"),
    code: t["tool.code"] ?? tr("Código", "Code", "Código"),
    link: t["tool.link"] ?? tr("Link", "Link", "Enlace"),
    image: t["tool.image"] ?? tr("Imagem", "Image", "Imagen"),
    list: t["tool.ul"] ?? tr("Lista", "List", "Lista"),
    orderedList: t["tool.ol"] ?? tr("Lista numerada", "Ordered list", "Lista numerada"),
    task: t["tool.task"] ?? tr("Tarefa", "Task", "Tarea"),
  };
  const themeColorFields = [
    {
      key: "bgHex" as const,
      label: tr("Shell", "Shell", "Shell"),
      note: tr("Plano principal da janela.", "Primary window surface.", "Plano principal de la ventana."),
    },
    {
      key: "uiHex" as const,
      label: tr("Chrome", "Chrome", "Chrome"),
      note: tr(
        "Topos, painéis e superfícies auxiliares.",
        "Top bars, panels, and secondary surfaces.",
        "Topes, paneles y superficies auxiliares."
      ),
    },
    {
      key: "uiBorderHex" as const,
      label: tr("Borda", "Border", "Borde"),
      note: tr("Separadores e contornos do shell.", "Shell dividers and outlines.", "Separadores y contornos del shell."),
    },
    {
      key: "fgHex" as const,
      label: tr("Texto do shell", "Shell text", "Texto del shell"),
      note: tr("Legibilidade dos painéis e controles.", "Panel and control legibility.", "Legibilidad de paneles y controles."),
    },
    {
      key: "editorBgHex" as const,
      label: tr("Editor", "Editor", "Editor"),
      note: tr("Fundo da área de edição.", "Editor background.", "Fondo del área de edición."),
    },
    {
      key: "editorFgHex" as const,
      label: tr("Texto do editor", "Editor text", "Texto del editor"),
      note: tr("Texto e linha ativa do editor.", "Editor text and active line.", "Texto y línea activa del editor."),
    },
    {
      key: "accentHex" as const,
      label: tr("Acento", "Accent", "Acento"),
      note: tr("Destaques, badges e focos.", "Highlights, badges, and focus points.", "Destacados, badges y puntos de foco."),
    },
  ];

  useEffect(() => {
    if (!open) return;
    setSelectedThemeId(settings.theme);
  }, [open, settings.theme]);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  if (!open) return null;

  const panelClass = `${tConfig.ui} ${tConfig.fg} ${tConfig.uiBorder}`;
  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg}`;
  const contentSurfaceStyle: React.CSSProperties = {
    background: `color-mix(in srgb, ${tConfig.editorBgHex} 72%, ${tConfig.uiHex} 28%)`,
    borderColor: `color-mix(in srgb, ${tConfig.uiBorderHex} 78%, ${tConfig.editorBgHex} 22%)`,
    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${tConfig.editorFgHex} 9%, transparent)`,
  };
  const activeTabStyle: React.CSSProperties = {
    background: `color-mix(in srgb, ${tConfig.fgHex} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${tConfig.fgHex} 10%, transparent)`,
  };

  const syncThemeLibrary = (library: ThemeDefinition[], activeThemeId = settings.theme) => {
    const nextActiveId = library.some((theme) => theme.id === activeThemeId) ? activeThemeId : library[0]?.id ?? settings.theme;
    onSettingsChange({
      themeLibrary: library,
      theme: nextActiveId,
    });
    if (!library.some((theme) => theme.id === selectedThemeId)) {
      setSelectedThemeId(nextActiveId);
    }
  };

  const updateTheme = (themeId: string, updater: (theme: ThemeDefinition) => ThemeDefinition) => {
    syncThemeLibrary(settings.themeLibrary.map((theme) => (theme.id === themeId ? updater(theme) : theme)));
  };

  const selectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    if (settings.theme !== themeId) {
      onSettingsChange({ theme: themeId });
    }
  };

  const createCustomTheme = () => {
    const source = selectedTheme ?? settings.themeLibrary[0] ?? getBuiltInTheme(Theme.Golden);
    if (!source) return;
    const nextTheme: ThemeDefinition = {
      ...source,
      id: `custom-${crypto.randomUUID()}`,
      name: `${getThemeName(source, t)} ${tr("custom", "custom", "personalizado")}`,
      builtIn: false,
      baseThemeId: (source.baseThemeId ?? source.id) as Theme,
      config: { ...source.config },
    };
    const nextLibrary = [...settings.themeLibrary, nextTheme];
    setSelectedThemeId(nextTheme.id);
    syncThemeLibrary(nextLibrary, nextTheme.id);
  };

  const duplicateTheme = (theme: ThemeDefinition) => {
    const nextTheme: ThemeDefinition = {
      ...theme,
      id: `custom-${crypto.randomUUID()}`,
      name: `${getThemeName(theme, t)} ${tr("cópia", "copy", "copia")}`,
      builtIn: false,
      baseThemeId: (theme.baseThemeId ?? theme.id) as Theme,
      config: { ...theme.config },
    };
    const nextLibrary = [...settings.themeLibrary, nextTheme];
    setSelectedThemeId(nextTheme.id);
    syncThemeLibrary(nextLibrary, nextTheme.id);
  };

  const restoreBuiltInTheme = (theme: ThemeDefinition) => {
    const builtInTheme = getBuiltInTheme(theme.id);
    if (!builtInTheme) return;
    updateTheme(theme.id, () => ({ ...builtInTheme, config: { ...builtInTheme.config } }));
  };

  const removeCustomTheme = (themeId: string) => {
    const theme = settings.themeLibrary.find((item) => item.id === themeId);
    if (!theme || theme.builtIn) return;
    const nextLibrary = settings.themeLibrary.filter((item) => item.id !== themeId);
    const fallbackThemeId =
      settings.theme === themeId ? nextLibrary[0]?.id ?? Theme.Golden : settings.theme;
    setSelectedThemeId(fallbackThemeId);
    syncThemeLibrary(nextLibrary, fallbackThemeId);
  };

  const setShortcut = (actionId: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const keys: string[] = [];
    if (event.ctrlKey) keys.push("Ctrl");
    if (event.altKey) keys.push("Alt");
    if (event.shiftKey) keys.push("Shift");
    if (event.metaKey) keys.push("Meta");
    const ignored = ["Control", "Alt", "Shift", "Meta"];
    if (!ignored.includes(event.key)) {
      keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
    }
    if (keys.length === 0) return;
    onSettingsChange({
      customShortcuts: {
        ...(settings.customShortcuts ?? {}),
        [actionId]: keys.join("+"),
      },
    });
  };

  const updatePreset = (presetId: string, updater: (preset: PublicationPreset) => PublicationPreset) => {
    onPublicationPresetsChange((current) => current.map((preset) => (preset.id === presetId ? updater(preset) : preset)));
  };

  const renderSwitch = (checked: boolean, onChange: (next: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex h-7 w-12 items-center rounded-full border px-1 transition ${checked ? "justify-end" : "justify-start"} ${tConfig.uiBorder}`}
      aria-pressed={checked}
    >
      <span className={`h-5 w-5 rounded-full ${checked ? "bg-emerald-400" : "bg-white/30"}`} />
    </button>
  );

  const renderSectionCard = (title: string, description: string, contentNode: React.ReactNode) => (
    <section className={`rounded-[24px] border p-5 ${panelClass}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] opacity-80">{title}</h3>
        <p className="mt-1 text-sm opacity-70">{description}</p>
      </div>
      {contentNode}
    </section>
  );

  const renderRangeField = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    suffix: string,
    onChange: (next: number) => void
  ) => (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="opacity-80">{label}</span>
        <span className="rounded-full px-2 py-0.5 text-xs opacity-70">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-current"
      />
    </label>
  );

  const renderColorField = ({
    pickerId,
    label,
    note,
    value,
    onChange,
  }: {
    pickerId: string;
    label: string;
    note: string;
    value: string;
    onChange: (next: string) => void;
  }) => (
    <div className="space-y-3 rounded-2xl border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs opacity-65">{note}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={(node) => {
            colorInputRefs.current[pickerId] = node;
          }}
          type="color"
          className="hidden"
          value={normalizeHex(value, "#000000")}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => colorInputRefs.current[pickerId]?.click()}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border p-1"
          title={tr("Abrir seletor de cor", "Open color picker", "Abrir selector de color")}
        >
          <span className="h-full w-full rounded-lg border border-black/10" style={{ backgroundColor: value }} />
        </button>
        <input
          className={`${inputClass} min-w-0 flex-1`}
          value={normalizeHex(value, "#000000")}
          onChange={(event) => onChange(normalizeHex(event.target.value, value))}
        />
      </div>
    </div>
  );

  const renderTabNav = (compact: boolean) => (
    <div className={compact ? "flex gap-2 overflow-x-auto pb-1" : "grid gap-2"}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={active ? activeTabStyle : undefined}
            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${compact ? "shrink-0 whitespace-nowrap" : ""} ${active ? "" : "border-transparent hover:bg-white/6"}`}
          >
            <span className={active ? "opacity-100" : "opacity-80"}>{tab.icon}</span>
            <span className={active ? "font-medium" : ""}>{tabLabels[tab.id]}</span>
          </button>
        );
      })}
    </div>
  );

  let content: React.ReactNode = (
    <div className="text-sm opacity-70">{tr("Carregando painel...", "Loading panel...", "Cargando panel...")}</div>
  );

  if (activeTab === "general") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Shell do app", "App shell", "Shell de la app"),
          tr(
            "Idioma, trilha de documentos e estrutura geral da janela.",
            "Language, document flow, and overall window structure.",
            "Idioma, flujo de documentos y estructura general de la ventana."
          ),
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.language"] ?? "Idioma"}</span>
              <select
                className={inputClass}
                value={settings.language}
                onChange={(event) => onSettingsChange({ language: event.target.value as Language })}
              >
                {languages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{tr("Abas", "Tabs", "Pestañas")}</p>
                <p className="text-xs opacity-70">
                  {tr(
                    "Mantém documentos abertos em uma trilha previsível.",
                    "Keeps open documents in a predictable strip.",
                    "Mantiene los documentos abiertos en una franja previsible."
                  )}
                </p>
              </div>
              {renderSwitch(settings.tabsEnabled, (tabsEnabled) => onSettingsChange({ tabsEnabled }))}
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{tr("Janela única", "Single window", "Ventana única")}</p>
                <p className="text-xs opacity-70">
                  {tr(
                    "Reaproveita a janela atual ao abrir arquivos.",
                    "Reuses the current window when opening files.",
                    "Reutiliza la ventana actual al abrir archivos."
                  )}
                </p>
              </div>
              {renderSwitch(settings.singleInstance, (singleInstance) => onSettingsChange({ singleInstance }))}
            </div>
          </div>
        )}
        {renderSectionCard(
          tr("Workspace", "Workspace", "Workspace"),
          tr(
            "Ative ou oculte a navegação lateral do projeto.",
            "Show or hide the project's lateral navigation.",
            "Muestra u oculta la navegación lateral del proyecto."
          ),
          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Sidebar</p>
                <p className="text-xs opacity-70">
                  {tr(
                    "Mostra workspace, busca e ações locais.",
                    "Shows workspace, search, and local actions.",
                    "Muestra el workspace, la búsqueda y las acciones locales."
                  )}
                </p>
              </div>
              {renderSwitch(settings.sidebarEnabled, (sidebarEnabled) => onSettingsChange({ sidebarEnabled }))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "appearance") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Biblioteca de temas", "Theme library", "Biblioteca de temas"),
          tr(
            "Temas padrão podem ser editados e restaurados. Temas personalizados podem ser duplicados e removidos.",
            "Built-in themes can be edited and restored. Custom themes can be duplicated and removed.",
            "Los temas predeterminados pueden editarse y restaurarse. Los temas personalizados pueden duplicarse y eliminarse."
          ),
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {settings.themeLibrary.map((theme) => {
                const active = settings.theme === theme.id;
                const selected = selectedTheme?.id === theme.id;
                const summary = describeTheme(theme);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => selectTheme(theme.id)}
                    className={`rounded-[18px] border p-2.5 text-left transition ${selected ? "ring-2 ring-white/45" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{getThemeName(theme, t)}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] opacity-65">
                          <span>{theme.builtIn ? tr("padrão", "built-in", "predeterminado") : tr("custom", "custom", "personalizado")}</span>
                          {active ? <span>{tr("ativo", "active", "activo")}</span> : null}
                        </div>
                      </div>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {[theme.config.bgHex, theme.config.uiHex, theme.config.editorBgHex, theme.config.fgHex, theme.config.accentHex].map((color, index) => (
                        <span key={`${theme.id}-${index}`} className="h-7 rounded-lg border" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="mt-3 grid gap-1 text-[11px] opacity-72">
                      <div className="flex items-center justify-between">
                        <span>{tr("Acento", "Accent", "Acento")}</span>
                        <span>{summary.accentContrast}:1</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{tr("Variação", "Variation", "Variación")}</span>
                        <span>{summary.shellDelta > 0.08 ? tr("mais marcada", "more distinct", "más marcada") : tr("mais suave", "softer", "más suave")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{tr("Contraste", "Contrast", "Contraste")}</span>
                        <span>{summary.contrast}:1</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTheme ? (
              <div className="rounded-[24px] border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">
                      {selectedTheme.builtIn
                        ? tr("Tema padrão", "Built-in theme", "Tema predeterminado")
                        : tr("Tema customizado", "Custom theme", "Tema personalizado")}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{getThemeName(selectedTheme, t)}</h3>
                    <p className="mt-1 text-sm opacity-70">
                      {tr(
                        "Ajuste shell, chrome, editor e destaque sem perder a opção de restaurar o original.",
                        "Adjust shell, chrome, editor, and accent colors while keeping the original available to restore.",
                        "Ajusta shell, chrome, editor y acento sin perder la opción de restaurar el original."
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="rounded-xl border px-3 py-2 text-sm" onClick={createCustomTheme}>
                      {tr("Novo tema", "New theme", "Nuevo tema")}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => duplicateTheme(selectedTheme)}
                    className="rounded-xl border px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
                  >
                    <CopyPlus className="h-4 w-4" />
                    {tr("Duplicar", "Duplicate", "Duplicar")}
                  </button>
                  {selectedTheme.builtIn ? (
                    <button
                      type="button"
                      onClick={() => restoreBuiltInTheme(selectedTheme)}
                      className="rounded-xl border px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {tr("Restaurar padrão", "Restore default", "Restaurar predeterminado")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeCustomTheme(selectedTheme.id)}
                      className="rounded-xl border px-4 py-2 text-sm font-medium text-rose-300 inline-flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {tr("Remover tema", "Remove theme", "Eliminar tema")}
                    </button>
                  )}
                </div>

                {!selectedTheme.builtIn ? (
                  <label className="mt-4 block space-y-2">
                    <span className="text-sm opacity-80">{tr("Nome do tema", "Theme name", "Nombre del tema")}</span>
                    <input
                      className={inputClass}
                      value={selectedTheme.name}
                      onChange={(event) =>
                        updateTheme(selectedTheme.id, (theme) => ({ ...theme, name: event.target.value }))
                      }
                    />
                  </label>
                ) : null}

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {themeColorFields.map((field) => (
                    <div key={String(field.key)}>
                      {renderColorField({
                        pickerId: `theme-${selectedTheme.id}-${String(field.key)}`,
                        label: field.label,
                        note: field.note,
                        value: String(selectedTheme.config[field.key]),
                        onChange: (next) =>
                          updateTheme(selectedTheme.id, (theme) => ({
                            ...theme,
                            config: {
                              ...theme.config,
                              [field.key]: normalizeHex(next, String(theme.config[field.key])),
                            },
                          })),
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "editor") {
    content = (
      <div className="grid gap-5 xl:grid-cols-2">
        {renderSectionCard(
          tr("Tipografia do editor", "Editor typography", "Tipografía del editor"),
          tr(
            "Ajusta leitura e ritmo do editor sem interferir na preview publicada.",
            "Adjusts reading rhythm without affecting the published preview.",
            "Ajusta la lectura y el ritmo sin afectar la vista publicada."
          ),
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.fontFamily"] ?? "Família"}</span>
              <select
                className={inputClass}
                value={settings.fontFamily}
                onChange={(event) => onSettingsChange({ fontFamily: event.target.value })}
              >
                <option value="mono">Mono</option>
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
              </select>
            </label>
            {renderRangeField(tr("Tamanho base", "Base size", "Tamaño base"), settings.fontSize, 12, 24, 1, "px", (fontSize) => onSettingsChange({ fontSize }))}
            {renderRangeField(tr("Altura de linha", "Line height", "Altura de línea"), settings.lineHeight, 1.2, 2.1, 0.05, "", (lineHeight) =>
              onSettingsChange({ lineHeight })
            )}
          </div>
        )}
        {renderSectionCard(
          tr("Escrita e persistência", "Writing and persistence", "Escritura y persistencia"),
          tr("Leitura, foco e salvamento do texto.", "Reading, focus, and text persistence.", "Lectura, foco y guardado del texto."),
          <div className="grid gap-3">
            {[
              [tr("Quebra de linha", "Word wrap", "Ajuste de línea"), settings.wordWrap, (wordWrap: boolean) => onSettingsChange({ wordWrap })],
              [tr("Modo máquina de escrever", "Typewriter mode", "Modo máquina de escribir"), settings.typewriterMode, (typewriterMode: boolean) => onSettingsChange({ typewriterMode })],
              [tr("Modo foco", "Focus mode", "Modo foco"), settings.focusMode, (focusMode: boolean) => onSettingsChange({ focusMode })],
              [tr("Corretor ortográfico", "Spell check", "Corrector ortográfico"), settings.spellCheck, (spellCheck: boolean) => onSettingsChange({ spellCheck })],
              [tr("Salvamento automático", "Auto save", "Guardado automático"), settings.autoSave, (autoSave: boolean) => onSettingsChange({ autoSave })],
            ].map(([label, checked, onToggle]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <span className="text-sm">{label as string}</span>
                {renderSwitch(checked as boolean, onToggle as (next: boolean) => void)}
              </div>
            ))}
            {renderRangeField(tr("Intervalo do auto save", "Auto-save interval", "Intervalo del guardado automático"), settings.autoSaveInterval, 15, 300, 15, "s", (autoSaveInterval) =>
              onSettingsChange({ autoSaveInterval })
            )}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "toolbar") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Posição e densidade", "Position and density", "Posición y densidad"),
          tr(
            "Defina onde a barra vive e como ela distribui espaço entre as categorias.",
            "Define where the bar lives and how it distributes space between categories.",
            "Define dónde vive la barra y cómo distribuye el espacio entre categorías."
          ),
          <div className="grid gap-4 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm opacity-80">{tr("Âncora da toolbar", "Toolbar anchor", "Ancla de la toolbar")}</span>
              <select
                className={inputClass}
                value={settings.floatingToolbarAnchor}
                onChange={(event) =>
                  onSettingsChange({
                    floatingToolbarAnchor: event.target.value as AppSettings["floatingToolbarAnchor"],
                    toolbarPosition: event.target.value as AppSettings["toolbarPosition"],
                  })
                }
              >
                <option value="top">{tr("Topo", "Top", "Superior")}</option>
                <option value="bottom">{tr("Base", "Bottom", "Inferior")}</option>
                <option value="left">{tr("Esquerda", "Left", "Izquierda")}</option>
                <option value="right">{tr("Direita", "Right", "Derecha")}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.toolbar.display"] ?? "Exibição"}</span>
              <select
                className={inputClass}
                value={settings.toolbarDisplayMode}
                onChange={(event) =>
                  onSettingsChange({ toolbarDisplayMode: event.target.value as AppSettings["toolbarDisplayMode"] })
                }
              >
                <option value="icon_text">{t["settings.toolbar.display.iconText"] ?? tr("Ícone + texto", "Icon + text", "Icono + texto")}</option>
                <option value="icon_only">{t["settings.toolbar.display.iconOnly"] ?? tr("Apenas ícone", "Icon only", "Solo icono")}</option>
                <option value="text_only">{t["settings.toolbar.display.textOnly"] ?? tr("Apenas texto", "Text only", "Solo texto")}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm opacity-80">{tr("Comportamento das categorias", "Category behavior", "Comportamiento de las categorías")}</span>
              <select
                className={inputClass}
                value={settings.toolbarSectionBehavior}
                onChange={(event) =>
                  onSettingsChange({
                    toolbarSectionBehavior: event.target.value as AppSettings["toolbarSectionBehavior"],
                  })
                }
              >
                <option value="default">{tr("Padrão", "Default", "Predeterminado")}</option>
                <option value="repulsion">{tr("Repulsão inteligente", "Smart repulsion", "Repulsión inteligente")}</option>
              </select>
            </label>
            {renderRangeField(tr("Breakpoint compacto", "Compact breakpoint", "Breakpoint compacto"), settings.toolbarCompactBreakpoint, 320, 1100, 20, "px", (toolbarCompactBreakpoint) =>
              onSettingsChange({ toolbarCompactBreakpoint })
            )}
          </div>
        )}
        {renderSectionCard(
          tr("Leitura e rótulos", "Readability and labels", "Lectura y etiquetas"),
          tr(
            "Controle o quanto a toolbar prioriza apoio visual e nomes explícitos.",
            "Control how much the toolbar prioritizes visual support and explicit naming.",
            "Controla cuánto prioriza la toolbar el apoyo visual y los nombres explícitos."
          ),
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border px-4 py-3">
              <p className="text-sm font-medium">{tr("Mostrar ícones junto do texto", "Show icons alongside text", "Mostrar iconos junto al texto")}</p>
              <p className="mb-3 text-xs opacity-70">
                {tr(
                  "Mantém o apoio visual dos ícones quando a toolbar estiver em modo textual.",
                  "Keeps icons visible as visual support when the toolbar is in text mode.",
                  "Mantiene los iconos visibles como apoyo visual cuando la toolbar está en modo texto."
                )}
              </p>
              {renderSwitch(settings.toolbarAlwaysShowIcons, (toolbarAlwaysShowIcons) =>
                onSettingsChange({ toolbarAlwaysShowIcons })
              )}
            </div>
            <div className="rounded-2xl border px-4 py-3">
              <p className="text-sm font-medium">{tr("Rótulos de categoria", "Category labels", "Etiquetas de categoría")}</p>
              <p className="mb-3 text-xs opacity-70">
                {tr(
                  "Mantém o nome das categorias visível quando fizer sentido.",
                  "Keeps category names visible when that improves scanability.",
                  "Mantiene visibles los nombres de las categorías cuando mejora la lectura."
                )}
              </p>
              {renderSwitch(settings.showToolbarSectionLabels, (showToolbarSectionLabels) =>
                onSettingsChange({ showToolbarSectionLabels })
              )}
            </div>
          </div>
        )}
        {renderSectionCard(
          tr("Conteúdo da barra", "Toolbar content", "Contenido de la barra"),
          tr(
            "Ligue ou desligue categorias inteiras e refine as ações visíveis em cada uma.",
            "Enable or disable full categories and refine the visible actions inside each one.",
            "Activa o desactiva categorías completas y ajusta las acciones visibles dentro de cada una."
          ),
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="mb-3 text-sm font-semibold">{tr("Categorias", "Categories", "Categorías")}</p>
              <div className="grid gap-3">
                {(["files", "editing", "system"] as Array<keyof AppSettings["toolbarSections"]>).map((sectionKey) => (
                  <div key={sectionKey} className="flex items-center justify-between">
                    <span className="text-sm">{toolbarSectionLabels[sectionKey]}</span>
                    {renderSwitch(settings.toolbarSections[sectionKey], (enabled) =>
                      onSettingsChange({ toolbarSections: { ...settings.toolbarSections, [sectionKey]: enabled } })
                    )}
                  </div>
                ))}
              </div>
            </div>
            {toolbarItemsBySection.map((group) => (
              <div key={group.titleKey} className="rounded-2xl border p-4">
                <p className="mb-3 text-sm font-semibold">{toolbarSectionLabels[group.titleKey]}</p>
                <div className="grid gap-3">
                  {group.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{toolbarItemLabels[item.labelKey]}</span>
                      {renderSwitch(settings.toolbarItems[item.key], (enabled) =>
                        onSettingsChange({ toolbarItems: { ...settings.toolbarItems, [item.key]: enabled } })
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "palette") {
    content = (
      <div className="grid gap-5 xl:grid-cols-2">
        {renderSectionCard(
          tr("Fontes de busca", "Search sources", "Fuentes de búsqueda"),
          tr(
            "Controle o que o command palette indexa e entrega.",
            "Control what the command palette indexes and surfaces.",
            "Controla qué indexa y muestra el command palette."
          ),
          <div className="grid gap-3">
            {[
              [tr("Ações do app", "App actions", "Acciones de la app"), settings.commandPalette.includeActions, (includeActions: boolean) =>
                onSettingsChange({ commandPalette: { ...settings.commandPalette, includeActions } })],
              [tr("Abas abertas", "Open tabs", "Pestañas abiertas"), settings.commandPalette.includeOpenTabs, (includeOpenTabs: boolean) =>
                onSettingsChange({ commandPalette: { ...settings.commandPalette, includeOpenTabs } })],
              [tr("Arquivos recentes", "Recent files", "Archivos recientes"), settings.commandPalette.includeRecentFiles, (includeRecentFiles: boolean) =>
                onSettingsChange({ commandPalette: { ...settings.commandPalette, includeRecentFiles } })],
              ["Snippets", settings.commandPalette.includeSnippets, (includeSnippets: boolean) =>
                onSettingsChange({ commandPalette: { ...settings.commandPalette, includeSnippets } })],
            ].map(([label, checked, onToggle]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <span className="text-sm">{label as string}</span>
                {renderSwitch(checked as boolean, onToggle as (next: boolean) => void)}
              </div>
            ))}
            {renderRangeField(tr("Limite de resultados", "Result limit", "Límite de resultados"), settings.commandPalette.maxResults, 6, 40, 1, "", (maxResults) =>
              onSettingsChange({ commandPalette: { ...settings.commandPalette, maxResults } })
            )}
          </div>
        )}
        {renderSectionCard(
          tr("Busca e execução", "Search and execution", "Búsqueda y ejecución"),
          tr(
            "Ajustes para transformar o palette em um centro de comando mais útil.",
            "Settings to turn the palette into a more useful command surface.",
            "Ajustes para convertir el palette en un centro de comandos más útil."
          ),
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm opacity-80">{tr("Modo de busca", "Search mode", "Modo de búsqueda")}</span>
              <select
                className={inputClass}
                value={settings.commandPalette.searchMode}
                onChange={(event) =>
                  onSettingsChange({
                    commandPalette: {
                      ...settings.commandPalette,
                      searchMode: event.target.value as AppSettings["commandPalette"]["searchMode"],
                    },
                  })
                }
              >
                <option value="standard">{tr("Padrão: nome, subtítulo e palavras-chave", "Standard: title, subtitle, and keywords", "Estándar: nombre, subtítulo y palabras clave")}</option>
                <option value="deep">{tr("Profundo: inclui conteúdo de snippets e caminhos completos", "Deep: includes snippet content and full paths", "Profundo: incluye contenido de snippets y rutas completas")}</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm opacity-80">{tr("Execução de snippets", "Snippet execution", "Ejecución de snippets")}</span>
              <select
                className={inputClass}
                value={settings.commandPalette.snippetBehavior}
                onChange={(event) =>
                  onSettingsChange({
                    commandPalette: {
                      ...settings.commandPalette,
                      snippetBehavior: event.target.value as AppSettings["commandPalette"]["snippetBehavior"],
                    },
                  })
                }
              >
                <option value="insert">{tr("Inserir direto no editor", "Insert directly into the editor", "Insertar directo en el editor")}</option>
                <option value="manage">{tr("Abrir gerenciador de snippets", "Open snippet manager", "Abrir gestor de snippets")}</option>
              </select>
            </label>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{tr("Fechar após executar", "Close after running", "Cerrar después de ejecutar")}</p>
                <p className="text-xs opacity-70">
                  {tr(
                    "Útil para comandos únicos. Desative para executar em sequência.",
                    "Useful for one-off commands. Disable it for chained actions.",
                    "Útil para comandos únicos. Desactívalo para ejecutar varios seguidos."
                  )}
                </p>
              </div>
              {renderSwitch(settings.commandPalette.closeAfterSelect, (closeAfterSelect) =>
                onSettingsChange({ commandPalette: { ...settings.commandPalette, closeAfterSelect } })
              )}
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{tr("Mostrar atalhos", "Show shortcuts", "Mostrar atajos")}</p>
                <p className="text-xs opacity-70">
                  {tr(
                    "Exibe o hint de atalho ao lado das ações compatíveis.",
                    "Shows shortcut hints next to compatible actions.",
                    "Muestra el atajo al lado de las acciones compatibles."
                  )}
                </p>
              </div>
              {renderSwitch(settings.commandPalette.showHints, (showHints) =>
                onSettingsChange({ commandPalette: { ...settings.commandPalette, showHints } })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "presets") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Presets de publicação", "Publishing presets", "Presets de publicación"),
          tr(
            "Preview e export HTML compartilham os mesmos tokens estruturados.",
            "Preview and HTML export share the same structural tokens.",
            "La vista previa y la exportación HTML comparten los mismos tokens estructurales."
          ),
          <div className="grid gap-4 xl:grid-cols-[minmax(0,260px)_1fr]">
            <div className="rounded-2xl border p-4">
              <label className="space-y-2">
                <span className="text-sm opacity-80">{t["settings.presets.active"] ?? tr("Preset ativo", "Active preset", "Preset activo")}</span>
                <select
                  className={inputClass}
                  value={settings.publicationPresetId}
                  onChange={(event) => onSettingsChange({ publicationPresetId: event.target.value })}
                >
                  {publicationPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onPublicationPresetsChange((current) => [
                      ...current,
                      createPublicationPreset(
                        crypto.randomUUID(),
                        `Preset ${current.length + 1}`,
                        tr("Novo preset customizável", "New customizable preset", "Nuevo preset personalizable"),
                        { bg: "#f8fafc", text: "#111827", accent: "#1d4ed8", muted: "#475569" }
                      ),
                    ])
                  }
                  className="w-full rounded-xl border px-4 py-2 text-sm font-medium"
                >
                  {t["settings.presets.add"] ?? tr("Adicionar preset", "Add preset", "Agregar preset")}
                </button>
              </div>
            </div>
            <div className="grid gap-4">
              {publicationPresets.map((preset) => {
                const expanded = expandedPresetIds.includes(preset.id);
                const contrast = contrastRatio(preset.surface.text, preset.surface.bg).toFixed(1);
                return (
                  <article key={preset.id} className="rounded-[24px] border p-4">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPresetIds((current) =>
                          current.includes(preset.id) ? current.filter((id) => id !== preset.id) : [...current, preset.id]
                        )
                      }
                      className="flex w-full items-center justify-between gap-4"
                    >
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold">{preset.name}</h3>
                          {settings.publicationPresetId === preset.id ? (
                            <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.16em]">
                              {tr("ativo", "active", "activo")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm opacity-70">{preset.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="grid grid-cols-5 gap-2">
                          {[preset.surface.bg, preset.surface.text, preset.surface.accent, preset.surface.muted, preset.surface.border].map((color, index) => (
                            <span key={`${preset.id}-${index}`} className="h-7 w-7 rounded-lg border" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-70">
                      <span className="rounded-full border px-2 py-1">contraste {contrast}:1</span>
                      <span className="rounded-full border px-2 py-1">{preset.spacing.columnWidth}px coluna</span>
                      <span className="rounded-full border px-2 py-1">{preset.typography.fontFamily.split(",")[0]}</span>
                    </div>
                    {expanded ? (
                      <div className="mt-4 grid gap-4 2xl:grid-cols-2">
                        <div className="rounded-2xl border p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Metadados</h4>
                          <div className="grid gap-4">
                            <label className="space-y-2">
                              <span className="text-sm opacity-80">Nome</span>
                              <input
                                className={inputClass}
                                value={preset.name}
                                onChange={(event) => updatePreset(preset.id, (current) => ({ ...current, name: event.target.value }))}
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm opacity-80">Descrição</span>
                              <input
                                className={inputClass}
                                value={preset.description}
                                onChange={(event) =>
                                  updatePreset(preset.id, (current) => ({ ...current, description: event.target.value }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                            {tr("Superfície", "Surface", "Superficie")}
                          </h4>
                          <div className="grid gap-3">
                            {([
                              ["bg", "Fundo", "Base visual da página"],
                              ["text", "Texto", "Leitura principal"],
                              ["accent", "Acento", "Links e destaques"],
                              ["muted", "Tom secundário", "Metadados e elementos de apoio"],
                              ["border", "Borda", "Contornos de superfícies"],
                            ] as const).map(([key, label, note]) => (
                              <div key={key}>
                                {renderColorField({
                                  pickerId: `preset-${preset.id}-${key}`,
                                  label,
                                  note,
                                  value: preset.surface[key],
                                  onChange: (next) =>
                                    updatePreset(preset.id, (current) => ({
                                      ...current,
                                      surface: { ...current.surface, [key]: normalizeHex(next, current.surface[key]) },
                                    })),
                                })}
                              </div>
                            ))}
                            <div className="sm:col-span-2">
                              {renderRangeField("Raio da superfície", preset.surface.radius, 0, 32, 1, "px", (radius) =>
                                updatePreset(preset.id, (current) => ({ ...current, surface: { ...current.surface, radius } }))
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Tipografia</h4>
                          <div className="grid gap-4">
                            {renderRangeField("Corpo", preset.typography.bodySize, 14, 24, 1, "px", (bodySize) =>
                              updatePreset(preset.id, (current) => ({ ...current, typography: { ...current.typography, bodySize } }))
                            )}
                            {renderRangeField(tr("Altura de linha", "Line height", "Altura de línea"), preset.typography.lineHeight, 1.2, 2.1, 0.05, "", (lineHeight) =>
                              updatePreset(preset.id, (current) => ({ ...current, typography: { ...current.typography, lineHeight } }))
                            )}
                            {renderRangeField("H1", preset.elements.h1.size, 26, 62, 1, "px", (size) =>
                              updatePreset(preset.id, (current) => ({ ...current, elements: { ...current.elements, h1: { ...current.elements.h1, size } } }))
                            )}
                            {renderRangeField("H2", preset.elements.h2.size, 22, 48, 1, "px", (size) =>
                              updatePreset(preset.id, (current) => ({ ...current, elements: { ...current.elements, h2: { ...current.elements.h2, size } } }))
                            )}
                            {renderRangeField("Parágrafo", preset.elements.p.size, 14, 24, 1, "px", (size) =>
                              updatePreset(preset.id, (current) => ({ ...current, elements: { ...current.elements, p: { ...current.elements.p, size } } }))
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Layout e ações</h4>
                          <div className="grid gap-4">
                            {renderRangeField("Padding da página", preset.spacing.pagePadding, 12, 72, 2, "px", (pagePadding) =>
                              updatePreset(preset.id, (current) => ({ ...current, spacing: { ...current.spacing, pagePadding } }))
                            )}
                            {renderRangeField("Largura de coluna", preset.spacing.columnWidth, 520, 1080, 10, "px", (columnWidth) =>
                              updatePreset(preset.id, (current) => ({ ...current, spacing: { ...current.spacing, columnWidth } }))
                            )}
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => onSettingsChange({ publicationPresetId: preset.id })}
                                className="rounded-xl border px-4 py-2 text-sm font-medium"
                              >
                                Usar preset
                              </button>
                              {publicationPresets.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => onPublicationPresetsChange((current) => current.filter((item) => item.id !== preset.id))}
                                  className="rounded-xl border px-4 py-2 text-sm font-medium text-rose-300"
                                >
                                  Remover
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "shortcuts") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          tr("Atalhos personalizados", "Custom shortcuts", "Atajos personalizados"),
          tr("Clique no campo e pressione a combinação desejada.", "Click the field and press the desired shortcut.", "Haz clic en el campo y presiona la combinación deseada."),
          <div className="grid gap-3 sm:grid-cols-2">
            {shortcutActionIds.map((actionId) => (
              <label key={actionId} className="space-y-2 rounded-2xl border p-4">
                <span className="text-sm font-medium">{shortcutLabels[actionId]}</span>
                <input
                  className={inputClass}
                  readOnly
                  value={settings.customShortcuts?.[actionId] ?? ""}
                  onKeyDown={(event) => setShortcut(actionId, event)}
                  placeholder={tr("Pressione um atalho", "Press a shortcut", "Presiona un atajo")}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[320]">
      <button
        type="button"
        aria-label={tr("Fechar configurações", "Close settings", "Cerrar configuración")}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-[max(24px,4vh)]">
        <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border shadow-2xl xl:flex-row ${panelClass}`}>
          <aside className={`hidden w-[228px] shrink-0 flex-col border-r xl:flex ${panelClass}`}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">Mark-Lee</p>
                <h2 className="mt-1 text-lg font-semibold">{t["settings.title"] ?? "Preferências"}</h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl border p-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">{renderTabNav(false)}</nav>
          </aside>
          <section className={`flex min-h-0 min-w-0 flex-1 flex-col ${panelClass}`}>
            <div className="border-b px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
                    {tr("Painel ativo", "Active panel", "Panel activo")}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">{tabs.find((tab) => tab.id === activeTab) ? tabLabels[activeTab] : ""}</h3>
                </div>
                <button type="button" onClick={onClose} className="rounded-xl border p-2 xl:hidden">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 max-w-3xl text-sm opacity-70">
                {tabDescriptions[activeTab]}
              </p>
              <div className="mt-4 xl:hidden">{renderTabNav(true)}</div>
            </div>
            <div ref={contentScrollRef} data-settings-scroll="true" className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
              <div className={`min-h-full rounded-[28px] border p-5 md:p-6 ${tConfig.fg}`} style={contentSurfaceStyle}>
                {content}
              </div>
            </div>
            {activePreset && activeTab === "presets" ? (
              <div className="border-t px-6 py-4 text-xs opacity-70">
                {tr("Preset ativo:", "Active preset:", "Preset activo:")} <span className="font-semibold">{activePreset.name}</span>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
