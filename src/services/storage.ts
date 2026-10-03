import { createDefaultThemeLibrary, DEFAULT_EDITOR_CURSOR, DEFAULT_JOURNAL_MEDIA_SETTINGS, DEFAULT_SETTINGS, THEMES } from "../constants";
import { AppSettings, DocumentTab, Language, Theme, ThemeDefinition, ThemeId } from "../types";

const SETTINGS_KEY = "mark-lee-settings";
const RECENT_FILES_KEY = "mark-lee-recent-files";
const LAST_TABS_KEY = "mark-lee-last-tabs";
const WORKSPACE_PATH_KEY = "mark-lee-workspace-path";
const MAX_RECENT_FILES = 15;

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

function normalizeLanguage(lang?: string): Language {
  const source = (lang || "").toLowerCase();
  if (source.startsWith("pt")) return "pt-BR";
  if (source.startsWith("es")) return "es-ES";
  return "en-US";
}

function normalizeEditorCursor(value: unknown): AppSettings["editorCursor"] {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const pointer = source.pointer === "system" || source.pointer === "outlined"
    ? source.pointer
    : DEFAULT_EDITOR_CURSOR.pointer;
  const caretColorMode =
    source.caretColorMode === "text" || source.caretColorMode === "accent" || source.caretColorMode === "custom"
      ? source.caretColorMode
      : DEFAULT_EDITOR_CURSOR.caretColorMode;
  const caretWidthRaw = Number(source.caretWidth);
  const caretBlinkIntervalRaw = Number(source.caretBlinkIntervalMs);
  const custom = typeof source.caretCustomColor === "string" ? source.caretCustomColor : DEFAULT_EDITOR_CURSOR.caretCustomColor;

  return {
    pointer,
    caretColorMode,
    caretCustomColor: /^#[0-9a-fA-F]{6}$/.test(custom) ? custom : DEFAULT_EDITOR_CURSOR.caretCustomColor,
    caretWidth: Number.isFinite(caretWidthRaw) ? Math.max(1, Math.min(6, Math.round(caretWidthRaw))) : DEFAULT_EDITOR_CURSOR.caretWidth,
    caretBlink: typeof source.caretBlink === "boolean" ? source.caretBlink : DEFAULT_EDITOR_CURSOR.caretBlink,
    caretBlinkIntervalMs: Number.isFinite(caretBlinkIntervalRaw)
      ? Math.max(240, Math.min(1400, Math.round(caretBlinkIntervalRaw)))
      : DEFAULT_EDITOR_CURSOR.caretBlinkIntervalMs,
  };
}

function normalizeJournalMedia(value: unknown): AppSettings["journalMedia"] {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const maxDimension = Number(source.maxDimension);
  const quality = Number(source.quality);
  return {
    importMode: source.importMode === "copy" || source.importMode === "ask" || source.importMode === "move"
      ? source.importMode
      : DEFAULT_JOURNAL_MEDIA_SETTINGS.importMode,
    preserveOriginals: typeof source.preserveOriginals === "boolean"
      ? source.preserveOriginals
      : DEFAULT_JOURNAL_MEDIA_SETTINGS.preserveOriginals,
    optimizeWebp: typeof source.optimizeWebp === "boolean"
      ? source.optimizeWebp
      : DEFAULT_JOURNAL_MEDIA_SETTINGS.optimizeWebp,
    maxDimension: Number.isFinite(maxDimension)
      ? Math.max(512, Math.min(4096, Math.round(maxDimension)))
      : DEFAULT_JOURNAL_MEDIA_SETTINGS.maxDimension,
    quality: Number.isFinite(quality)
      ? Math.max(0.5, Math.min(0.95, quality))
      : DEFAULT_JOURNAL_MEDIA_SETTINGS.quality,
  };
}

function withMigrations(settings: Partial<AppSettings>): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...settings } as AppSettings;
  merged.language = normalizeLanguage(merged.language);

  if ((settings as any).theme === "terminal_classic") {
    merged.theme = Theme.Neomatrix;
  }
  if ((settings as any).theme === "terminal_amber") {
    merged.theme = Theme.Firenight;
  }

// `top`, `left` e `right` saíram do enumérico de `floatingToolbarAnchor`. Quem
  // tinha qualquer um deles salvo recebe `integrated` — que é a posição escolhida,
  // não um piso de compatibilidade. O valor antigo não é mais lido, mas continua
  // no disco: é o que permite desfazer a migração sem perder a preferência de
  // ninguém.
  if (settings.floatingToolbarAnchor !== "integrated" && settings.floatingToolbarAnchor !== "bottom") {
    merged.floatingToolbarAnchor = "integrated";
  }

  // A preferência da barra é guardada por âncora (`toolbarByAnchor`). Sem esta
  // migração, quem tinha a Toolbar salva em `top`/`left`/`right` perderia a
  // própria configuração ao mudar de âncora — voltaria ao padrão sem ele pedir.
  // A âncora velha e `integrated` não existiam juntas, então a preferência
  // escrita primeiro não é sobrescrita.
  // Terceiro estado do sidebar: quem ja tem `sidebarEnabled` salvo continua
  // expandido ou oculto, exatamente como estava. O estado colapsado e novo, e
  // nasce desligado — e o default em `DEFAULT_SETTINGS` faz o mesmo por quem
  // nunca teve settings gravados. Guardar "36px" dentro de `sidebarWidth`
  // pareceria mais simples e perderia a largura que a pessoa escolheu.
  if (typeof merged.sidebarCollapsed !== "boolean") {
    merged.sidebarCollapsed = false;
  }
  const byAnchor = settings.toolbarByAnchor as
    | Record<string, Partial<AppSettings> | undefined>
    | undefined;
  if (byAnchor && typeof byAnchor === "object") {
    const migrated = { ...byAnchor };
    let changed = false;
    for (const legacy of ["top", "left", "right"]) {
      const saved = migrated[legacy];
      if (!saved) continue;
      if (!migrated.integrated) migrated.integrated = saved;
      delete migrated[legacy];
      changed = true;
    }
    if (changed) merged.toolbarByAnchor = migrated as AppSettings["toolbarByAnchor"];
  }

  const defaultThemeLibrary = createDefaultThemeLibrary();
  const storedThemes = Array.isArray(settings.themeLibrary) ? settings.themeLibrary : [];
  const customThemes = storedThemes.filter((theme) => !theme?.builtIn);
  const builtInOverrides = new Map(
    storedThemes
      .filter((theme): theme is ThemeDefinition => Boolean(theme?.builtIn && theme.id))
      .map((theme) => [theme.id, theme])
  );
  merged.themeLibrary = [
    ...defaultThemeLibrary.map((theme) => {
      const stored = builtInOverrides.get(theme.id);
      return stored
        ? {
            ...theme,
            ...stored,
            config: { ...theme.config, ...(stored.config || {}) },
            builtIn: true,
            baseThemeId: (theme.baseThemeId ?? theme.id) as Theme,
          }
        : theme;
    }),
    ...customThemes
      .filter((theme): theme is ThemeDefinition => Boolean(theme?.id && theme?.config))
      .map((theme) => ({
        ...theme,
        builtIn: false,
        baseThemeId:
          theme.baseThemeId && Object.values(Theme).includes(theme.baseThemeId)
            ? theme.baseThemeId
            : Theme.Golden,
        config: {
          ...THEMES[(theme.baseThemeId as Theme) || Theme.Golden],
          ...theme.config,
        },
      })),
  ];

  const availableThemeIds = new Set<ThemeId>(merged.themeLibrary.map((theme) => theme.id));
  if (!availableThemeIds.has(merged.theme)) {
    merged.theme = DEFAULT_SETTINGS.theme;
  }

  merged.chromeMode = "unified";

  if (
    !["top", "bottom", "left", "right"].includes(
      merged.floatingToolbarAnchor as unknown as string
    )
  ) {
    merged.floatingToolbarAnchor = DEFAULT_SETTINGS.floatingToolbarAnchor;
  }

  if (!["edit", "split", "preview"].includes(merged.viewMode)) {
    merged.viewMode = DEFAULT_SETTINGS.viewMode;
  }

  if (typeof merged.splitRatio !== "number" || merged.splitRatio < 0.2 || merged.splitRatio > 0.8) {
    merged.splitRatio = DEFAULT_SETTINGS.splitRatio;
  }

  const validFontFamilies = [
    "theme_default",
    "mono",
    "sans",
    "serif",
    "jetbrains_mono",
    "fira_code",
    "cascadia_code",
    "ibm_plex_mono",
    "source_code_pro",
    "merriweather",
    "georgia",
  ];
  if (!validFontFamilies.includes(merged.fontFamily)) {
    merged.fontFamily = DEFAULT_SETTINGS.fontFamily;
  }

  merged.customShortcuts = {
    ...DEFAULT_SETTINGS.customShortcuts,
    ...(merged.customShortcuts || {}),
  };

  merged.accordionState = {
    ...DEFAULT_SETTINGS.accordionState,
    ...(merged.accordionState || {}),
  };

  merged.findReplace = {
    ...DEFAULT_SETTINGS.findReplace,
    ...(merged.findReplace || {}),
  };

  if (!merged.publicationPresetId) {
    merged.publicationPresetId = merged.presetId || DEFAULT_SETTINGS.publicationPresetId;
  }

  merged.toolbarSections = {
    ...DEFAULT_SETTINGS.toolbarSections,
    ...(merged.toolbarSections || {}),
  };
  merged.toolbarSections.system = true;

  merged.toolbarItems = {
    ...DEFAULT_SETTINGS.toolbarItems,
    ...(merged.toolbarItems || {}),
  };
  merged.toolbarItems.sysSettings = true;

  // Só `integrated` e `bottom` continuam. `top`, `left` e `right` foram absorvidas
  // por `integrated` na migração acima, então preenchê-las aqui recriaria chaves
  // que o enumérico não aceita.
  const anchors: Array<"integrated" | "bottom"> = ["integrated", "bottom"];
  const toolbarByAnchor = merged.toolbarByAnchor || {};
  merged.toolbarByAnchor = {};
  for (const anchor of anchors) {
    const fallback = DEFAULT_SETTINGS.toolbarByAnchor?.[anchor];
    const current = toolbarByAnchor[anchor];
    merged.toolbarByAnchor[anchor] = {
      showToolbarSectionLabels:
        current?.showToolbarSectionLabels ?? fallback?.showToolbarSectionLabels ?? DEFAULT_SETTINGS.showToolbarSectionLabels,
      toolbarCompactBreakpoint:
        current?.toolbarCompactBreakpoint ?? fallback?.toolbarCompactBreakpoint ?? DEFAULT_SETTINGS.toolbarCompactBreakpoint,
      toolbarDisplayMode:
        current?.toolbarDisplayMode ?? fallback?.toolbarDisplayMode ?? DEFAULT_SETTINGS.toolbarDisplayMode,
      toolbarSectionBehavior:
        current?.toolbarSectionBehavior ?? fallback?.toolbarSectionBehavior ?? DEFAULT_SETTINGS.toolbarSectionBehavior,
      toolbarSections: {
        ...DEFAULT_SETTINGS.toolbarSections,
        ...(fallback?.toolbarSections || {}),
        ...(current?.toolbarSections || {}),
      },
      toolbarItems: {
        ...DEFAULT_SETTINGS.toolbarItems,
        ...(fallback?.toolbarItems || {}),
        ...(current?.toolbarItems || {}),
      },
    };
    merged.toolbarByAnchor[anchor]!.toolbarSections.system = true;
    merged.toolbarByAnchor[anchor]!.toolbarItems.sysSettings = true;
  }

  if (!["icon_text", "icon_only", "text_only"].includes(merged.toolbarDisplayMode)) {
    merged.toolbarDisplayMode = DEFAULT_SETTINGS.toolbarDisplayMode;
  }
  if (!["default", "repulsion"].includes(merged.toolbarSectionBehavior)) {
    merged.toolbarSectionBehavior = DEFAULT_SETTINGS.toolbarSectionBehavior;
  }
  if (!Number.isFinite(merged.toolbarCompactBreakpoint as number)) {
    merged.toolbarCompactBreakpoint = DEFAULT_SETTINGS.toolbarCompactBreakpoint;
  }
  merged.toolbarCompactBreakpoint = Math.max(360, Math.min(900, Math.round(merged.toolbarCompactBreakpoint)));

  if (!merged.sidebarWidth || merged.sidebarWidth < 220) merged.sidebarWidth = 300;
  if (merged.sidebarWidth > 520) merged.sidebarWidth = 520;

  merged.editorCursor = normalizeEditorCursor((settings as Partial<AppSettings>).editorCursor);
  merged.journalMedia = normalizeJournalMedia((settings as Partial<AppSettings>).journalMedia);

  merged.commandPalette = {
    ...DEFAULT_SETTINGS.commandPalette,
    ...(merged.commandPalette || {}),
  };
  merged.commandPalette.maxResults = Math.max(6, Math.min(40, Math.round(merged.commandPalette.maxResults)));
  if (!["standard", "deep"].includes(merged.commandPalette.searchMode)) {
    merged.commandPalette.searchMode = DEFAULT_SETTINGS.commandPalette.searchMode;
  }
  if (!["insert", "manage"].includes(merged.commandPalette.snippetBehavior)) {
    merged.commandPalette.snippetBehavior = DEFAULT_SETTINGS.commandPalette.snippetBehavior;
  }

  return merged;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

export function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return withMigrations(JSON.parse(stored));
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return withMigrations({
    ...DEFAULT_SETTINGS,
    language: normalizeLanguage(navigator.language),
  });
}

export function getRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load recent files:", error);
    return [];
  }
}

export function addRecentFile(path: string, name: string): void {
  try {
    const recent = getRecentFiles().filter((item) => item.path !== path);
    recent.unshift({ path, name, lastOpened: Date.now() });
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_FILES)));
  } catch (error) {
    console.error("Failed to add recent file:", error);
  }
}

export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(RECENT_FILES_KEY);
  } catch (error) {
    console.error("Failed to clear recent files:", error);
  }
}

export function saveLastTabs(tabs: DocumentTab[]): void {
  try {
    localStorage.setItem(LAST_TABS_KEY, JSON.stringify(tabs));
  } catch (error) {
    console.error("Failed to save last tabs:", error);
  }
}

export function loadLastTabs(): DocumentTab[] {
  try {
    const stored = localStorage.getItem(LAST_TABS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as DocumentTab[];
    return parsed.filter((tab) => !!tab.id && typeof tab.content === "string");
  } catch (error) {
    console.error("Failed to load last tabs:", error);
    return [];
  }
}

export function saveWorkspacePath(path: string | null): void {
  try {
    if (path) {
      localStorage.setItem(WORKSPACE_PATH_KEY, path);
    } else {
      localStorage.removeItem(WORKSPACE_PATH_KEY);
    }
  } catch (error) {
    console.error("Failed to save workspace path:", error);
  }
}

export function loadWorkspacePath(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_PATH_KEY);
  } catch (error) {
    console.error("Failed to load workspace path:", error);
    return null;
  }
}
