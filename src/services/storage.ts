import { DEFAULT_SETTINGS, THEMES } from "../constants";
import { AppSettings, DocumentTab, Language, Theme } from "../types";

const SETTINGS_KEY = "mark-lee-settings";
const RECENT_FILES_KEY = "mark-lee-recent-files";
const LAST_TABS_KEY = "mark-lee-last-tabs";
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

  if (!Object.values(Theme).includes(merged.theme)) {
    merged.theme = DEFAULT_SETTINGS.theme;
  }
  if (!THEMES[merged.theme]) {
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

  if (!["icon_text", "icon_only", "text_only"].includes(merged.toolbarDisplayMode)) {
    merged.toolbarDisplayMode = DEFAULT_SETTINGS.toolbarDisplayMode;
  }

  if (!merged.sidebarWidth || merged.sidebarWidth < 220) merged.sidebarWidth = 300;
  if (merged.sidebarWidth > 520) merged.sidebarWidth = 520;

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
