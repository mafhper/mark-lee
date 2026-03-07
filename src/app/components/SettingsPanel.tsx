import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Keyboard,
  Layers3,
  Palette,
  Settings2,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import { THEMES } from "../../constants";
import { createPublicationPreset } from "../../services/publication-style";
import { AppSettings, Language, PublicationPreset, Theme, ThemeConfig } from "../../types";

type SettingsTabId =
  | "general"
  | "appearance"
  | "editor"
  | "toolbar"
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

const tabs: Array<{ id: SettingsTabId; label: string; icon: React.ReactNode }> = [
  { id: "general", label: "Geral", icon: <Settings2 className="h-4 w-4" /> },
  { id: "appearance", label: "Aparencia", icon: <Palette className="h-4 w-4" /> },
  { id: "editor", label: "Editor", icon: <Type className="h-4 w-4" /> },
  { id: "toolbar", label: "Toolbar", icon: <Sparkles className="h-4 w-4" /> },
  { id: "presets", label: "Presets", icon: <Layers3 className="h-4 w-4" /> },
  { id: "shortcuts", label: "Atalhos", icon: <Keyboard className="h-4 w-4" /> },
];

const languages: Language[] = ["pt-BR", "en-US", "es-ES"];

const shortcutActions = [
  { id: "file-save", label: "Salvar" },
  { id: "file-open", label: "Abrir arquivo" },
  { id: "file-open-folder", label: "Abrir pasta" },
  { id: "edit-find", label: "Buscar" },
  { id: "edit-snippets", label: "Snippets" },
  { id: "app-command-palette", label: "Command palette" },
  { id: "app-settings", label: "Configuracoes" },
  { id: "fmt-bold", label: "Negrito" },
  { id: "fmt-italic", label: "Italico" },
  { id: "fmt-link", label: "Link" },
];

const toolbarItemsBySection: Array<{
  title: string;
  items: Array<{ key: keyof AppSettings["toolbarItems"]; label: string }>;
}> = [
  {
    title: "Arquivos",
    items: [
      { key: "fileNew", label: "Novo" },
      { key: "fileOpen", label: "Abrir" },
      { key: "fileOpenFolder", label: "Abrir pasta" },
      { key: "fileSave", label: "Salvar" },
      { key: "fileExport", label: "Exportar" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { key: "sysFind", label: "Buscar" },
      { key: "sysSnippets", label: "Snippets" },
      { key: "sysTheme", label: "Tema" },
      { key: "sysSidebar", label: "Sidebar" },
      { key: "sysEdit", label: "Editor" },
      { key: "sysSplit", label: "Split" },
      { key: "sysPreview", label: "Preview" },
      { key: "sysZen", label: "Zen" },
      { key: "sysSettings", label: "Configuracoes" },
    ],
  },
  {
    title: "Edicao",
    items: [
      { key: "editBold", label: "Negrito" },
      { key: "editItalic", label: "Italico" },
      { key: "editCode", label: "Codigo" },
      { key: "editLink", label: "Link" },
      { key: "editImage", label: "Imagem" },
      { key: "editUL", label: "Lista" },
      { key: "editOL", label: "Lista numerada" },
      { key: "editTask", label: "Tarefa" },
    ],
  },
];

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (![3, 6].includes(normalized.length)) return null;
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
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const activePreset = useMemo(
    () => publicationPresets.find((preset) => preset.id === settings.publicationPresetId) ?? publicationPresets[0] ?? null,
    [publicationPresets, settings.publicationPresetId]
  );

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  if (!open) return null;

  const themeCards = Object.entries(THEMES) as Array<[Theme, ThemeConfig]>;
  const panelClass = `${tConfig.ui} ${tConfig.fg} ${tConfig.uiBorder}`;
  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg}`;
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

  const renderTabNav = (compact: boolean) => (
    <div className={compact ? "flex gap-2 overflow-x-auto pb-1" : "grid gap-2"}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${compact ? "shrink-0 whitespace-nowrap" : ""} ${active ? "bg-white/12" : "hover:bg-white/6"}`}
          >
            <span className="opacity-80">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  let content: React.ReactNode = <div className="text-sm opacity-70">Carregando painel...</div>;

  if (activeTab === "general") {
    content = (
      <div className="grid gap-5 xl:grid-cols-2">
        {renderSectionCard(
          "Fluxo do app",
          "Opcoes principais do shell e da navegacao do app.",
          <div className="grid gap-4 sm:grid-cols-2">
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
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.floatingAnchor"] ?? "Ancora da barra"}</span>
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
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Abas</p>
                <p className="text-xs opacity-70">Mantem documentos abertos em uma trilha previsivel.</p>
              </div>
              {renderSwitch(settings.tabsEnabled, (tabsEnabled) => onSettingsChange({ tabsEnabled }))}
            </div>
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Sidebar</p>
                <p className="text-xs opacity-70">Mostra workspace, busca e acoes locais.</p>
              </div>
              {renderSwitch(settings.sidebarEnabled, (sidebarEnabled) => onSettingsChange({ sidebarEnabled }))}
            </div>
          </div>
        )}
        {renderSectionCard(
          "Workspace",
          "Ajustes estruturais da janela e da coluna lateral.",
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Janela unica</p>
                <p className="text-xs opacity-70">Reaproveita a janela atual ao abrir arquivos.</p>
              </div>
              {renderSwitch(settings.singleInstance, (singleInstance) => onSettingsChange({ singleInstance }))}
            </div>
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.transparency"] ?? "Transparencia"}</span>
              <input
                type="range"
                min={0.55}
                max={1}
                step={0.05}
                value={settings.transparency}
                onChange={(event) => onSettingsChange({ transparency: Number(event.target.value) })}
                className="w-full accent-current"
              />
            </label>
            {renderRangeField("Largura da sidebar", settings.sidebarWidth, 220, 520, 10, "px", (sidebarWidth) =>
              onSettingsChange({ sidebarWidth })
            )}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "appearance") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          "Tema do shell",
          "O tema do app controla chrome, editor e painéis. O preset de publicacao continua separado.",
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {themeCards.map(([themeId, themeConfig]) => {
              const active = settings.theme === themeId;
              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => onSettingsChange({ theme: themeId })}
                  className={`rounded-[22px] border p-4 text-left transition ${active ? "ring-2 ring-white/50" : ""}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">{themeId}</span>
                    {active ? <Check className="h-4 w-4" /> : null}
                  </div>
                  <div className="mb-3 flex gap-2">
                    <span className="h-8 flex-1 rounded-xl" style={{ backgroundColor: themeConfig.bgHex }} />
                    <span className="h-8 flex-1 rounded-xl" style={{ backgroundColor: themeConfig.uiHex }} />
                    <span className="h-8 flex-1 rounded-xl" style={{ backgroundColor: themeConfig.fgHex }} />
                  </div>
                  <p className="text-xs opacity-70">{themeConfig.uiFont}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "editor") {
    content = (
      <div className="grid gap-5 xl:grid-cols-2">
        {renderSectionCard(
          "Tipografia do editor",
          "Ajusta leitura e ritmo do editor sem interferir na preview publicada.",
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.fontFamily"] ?? "Familia"}</span>
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
            {renderRangeField("Tamanho base", settings.fontSize, 12, 24, 1, "px", (fontSize) => onSettingsChange({ fontSize }))}
            {renderRangeField("Altura de linha", settings.lineHeight, 1.2, 2.1, 0.05, "", (lineHeight) =>
              onSettingsChange({ lineHeight })
            )}
          </div>
        )}
        {renderSectionCard(
          "Comportamento",
          "Leitura, foco e persistencia do texto.",
          <div className="grid gap-3">
            {[
              ["Quebra de linha", settings.wordWrap, (wordWrap: boolean) => onSettingsChange({ wordWrap })],
              ["Typewriter", settings.typewriterMode, (typewriterMode: boolean) => onSettingsChange({ typewriterMode })],
              ["Focus mode", settings.focusMode, (focusMode: boolean) => onSettingsChange({ focusMode })],
              ["Spell check", settings.spellCheck, (spellCheck: boolean) => onSettingsChange({ spellCheck })],
              ["Auto save", settings.autoSave, (autoSave: boolean) => onSettingsChange({ autoSave })],
            ].map(([label, checked, onToggle]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                <span className="text-sm">{label as string}</span>
                {renderSwitch(checked as boolean, onToggle as (next: boolean) => void)}
              </div>
            ))}
            {renderRangeField("Intervalo do auto save", settings.autoSaveInterval, 15, 300, 15, "s", (autoSaveInterval) =>
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
          "Composicao",
          "A barra passa a ser configurada por densidade, rotulos e grupos reais.",
          <div className="grid gap-4 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm opacity-80">{t["settings.toolbar.display"] ?? "Exibicao"}</span>
              <select
                className={inputClass}
                value={settings.toolbarDisplayMode}
                onChange={(event) =>
                  onSettingsChange({ toolbarDisplayMode: event.target.value as AppSettings["toolbarDisplayMode"] })
                }
              >
                <option value="icon_text">Icone + texto</option>
                <option value="icon_only">Apenas icone</option>
                <option value="text_only">Apenas texto</option>
              </select>
            </label>
            {renderRangeField("Breakpoint compacto", settings.toolbarCompactBreakpoint, 320, 1100, 20, "px", (toolbarCompactBreakpoint) =>
              onSettingsChange({ toolbarCompactBreakpoint })
            )}
            <div className="rounded-2xl border px-4 py-3">
              <p className="text-sm font-medium">Icones sempre visiveis</p>
              <p className="mb-3 text-xs opacity-70">Mantem os icones na barra mesmo quando o modo textual estiver ativo.</p>
              {renderSwitch(settings.toolbarAlwaysShowIcons, (toolbarAlwaysShowIcons) =>
                onSettingsChange({ toolbarAlwaysShowIcons })
              )}
            </div>
            <div className="rounded-2xl border px-4 py-3">
              <p className="text-sm font-medium">Rotulos de categoria</p>
              <p className="mb-3 text-xs opacity-70">Mantem o container das categorias sempre legivel.</p>
              {renderSwitch(settings.showToolbarSectionLabels, (showToolbarSectionLabels) =>
                onSettingsChange({ showToolbarSectionLabels })
              )}
            </div>
          </div>
        )}
        {renderSectionCard(
          "Blocos e itens",
          "Ligue ou desligue grupos inteiros e acoes especificas.",
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="mb-3 text-sm font-semibold">Categorias</p>
              <div className="grid gap-3">
                {(["files", "editing", "system"] as Array<keyof AppSettings["toolbarSections"]>).map((sectionKey) => (
                  <div key={sectionKey} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{sectionKey}</span>
                    {renderSwitch(settings.toolbarSections[sectionKey], (enabled) =>
                      onSettingsChange({ toolbarSections: { ...settings.toolbarSections, [sectionKey]: enabled } })
                    )}
                  </div>
                ))}
              </div>
            </div>
            {toolbarItemsBySection.map((group) => (
              <div key={group.title} className="rounded-2xl border p-4">
                <p className="mb-3 text-sm font-semibold">{group.title}</p>
                <div className="grid gap-3">
                  {group.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{item.label}</span>
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

  if (activeTab === "presets") {
    content = (
      <div className="grid gap-5">
        {renderSectionCard(
          "Preset ativo",
          "Preview e export HTML compartilham os mesmos tokens estruturados.",
          <div className="grid gap-4 xl:grid-cols-[minmax(0,260px)_1fr]">
            <div className="rounded-2xl border p-4">
              <label className="space-y-2">
                <span className="text-sm opacity-80">{t["settings.presets.active"] ?? "Preset ativo"}</span>
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
              <button
                type="button"
                onClick={() =>
                  onPublicationPresetsChange((current) => [
                    ...current,
                    createPublicationPreset(
                      crypto.randomUUID(),
                      `Preset ${current.length + 1}`,
                      "Novo preset customizavel",
                      { bg: "#f8fafc", text: "#111827", accent: "#1d4ed8", muted: "#475569" }
                    ),
                  ])
                }
                className="mt-4 w-full rounded-xl border px-4 py-2 text-sm font-medium"
              >
                {t["settings.presets.add"] ?? "Adicionar preset"}
              </button>
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
                            <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.16em]">ativo</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm opacity-70">{preset.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          {[preset.surface.bg, preset.surface.text, preset.surface.accent].map((color) => (
                            <span key={color} className="h-8 w-8 rounded-xl border" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-70">
                      <span className="rounded-full border px-2 py-1">contraste {contrast}:1</span>
                      <span className="rounded-full border px-2 py-1">{preset.spacing.columnWidth}px coluna</span>
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
                              <span className="text-sm opacity-80">Descricao</span>
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
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Surface</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {(["bg", "text", "accent", "muted"] as const).map((key) => (
                              <label key={key} className="space-y-2">
                                <span className="text-sm opacity-80">Surface {key}</span>
                                <input
                                  type="color"
                                  className="h-11 w-full rounded-xl border bg-transparent p-1"
                                  value={preset.surface[key]}
                                  onChange={(event) =>
                                    updatePreset(preset.id, (current) => ({
                                      ...current,
                                      surface: { ...current.surface, [key]: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                            ))}
                            <div className="sm:col-span-2">
                              {renderRangeField("Raio da superficie", preset.surface.radius, 0, 32, 1, "px", (radius) =>
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
                            {renderRangeField("Line height", preset.typography.lineHeight, 1.2, 2.1, 0.05, "", (lineHeight) =>
                              updatePreset(preset.id, (current) => ({ ...current, typography: { ...current.typography, lineHeight } }))
                            )}
                            {renderRangeField("H1", preset.elements.h1.size, 26, 62, 1, "px", (size) =>
                              updatePreset(preset.id, (current) => ({ ...current, elements: { ...current.elements, h1: { ...current.elements.h1, size } } }))
                            )}
                            {renderRangeField("H2", preset.elements.h2.size, 22, 48, 1, "px", (size) =>
                              updatePreset(preset.id, (current) => ({ ...current, elements: { ...current.elements, h2: { ...current.elements.h2, size } } }))
                            )}
                            {renderRangeField("Paragrafo", preset.elements.p.size, 14, 24, 1, "px", (size) =>
                              updatePreset(preset.id, (current) => ({ ...current, elements: { ...current.elements, p: { ...current.elements.p, size } } }))
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Layout e acoes</h4>
                          <div className="grid gap-4">
                            {renderRangeField("Padding da pagina", preset.spacing.pagePadding, 12, 72, 2, "px", (pagePadding) =>
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
          "Atalhos",
          "Clique no campo e pressione a combinacao desejada.",
          <div className="grid gap-3 sm:grid-cols-2">
            {shortcutActions.map((action) => (
              <label key={action.id} className="space-y-2 rounded-2xl border p-4">
                <span className="text-sm font-medium">{action.label}</span>
                <input
                  className={inputClass}
                  readOnly
                  value={settings.customShortcuts?.[action.id] ?? ""}
                  onKeyDown={(event) => setShortcut(action.id, event)}
                  placeholder="Pressione um atalho"
                />
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-[max(24px,4vh)]">
        <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border shadow-2xl xl:flex-row ${panelClass}`}>
          <aside className={`hidden w-[228px] shrink-0 flex-col border-r xl:flex ${panelClass}`}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">Mark-Lee</p>
                <h2 className="mt-1 text-lg font-semibold">{t["settings.title"] ?? "Preferencias"}</h2>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">Painel ativo</p>
                  <h3 className="mt-1 text-2xl font-semibold">{tabs.find((tab) => tab.id === activeTab)?.label}</h3>
                </div>
                <button type="button" onClick={onClose} className="rounded-xl border p-2 xl:hidden">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 max-w-3xl text-sm opacity-70">
                Estrutura em abas, menor densidade visual e controles organizados por superficie real da interface.
              </p>
              <div className="mt-4 xl:hidden">{renderTabNav(true)}</div>
            </div>
            <div ref={contentScrollRef} data-settings-scroll="true" className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">{content}</div>
            {activePreset ? (
              <div className="border-t px-6 py-4 text-xs opacity-70">
                Preset ativo: <span className="font-semibold">{activePreset.name}</span>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
