import { createDefaultThemeLibrary, DEFAULT_SETTINGS, THEMES } from "../constants";
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

function withMigrations(settings: Partial<AppSettings>): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...settings } as AppSettings;
  merged.language = normalizeLanguage(merged.language);

  if ((settings as any).theme === "terminal_classic") {
    merged.theme = Theme.Neomatrix;
  }
  if ((settings as any).theme === "terminal_amber") {
    merged.theme = Theme.Firenight;
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

  const anchors: Array<"top" | "bottom" | "left" | "right"> = ["top", "bottom", "left", "right"];
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
