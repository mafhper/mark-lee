import React, { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { invoke } from "@tauri-apps/api/core";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { formatMarkdown, minifyMarkdown } from "./services/markdown-processor";
import {
  addRecentFile,
  getRecentFiles,
  loadLastTabs,
  loadSettings,
  loadWorkspacePath,
  saveLastTabs,
  saveSettings,
  saveWorkspacePath,
} from "./services/storage";
import {
  copyImageToDocumentDir,
  createWorkspaceDirectory,
  createWorkspaceFile,
  deleteWorkspacePath,
  openFileDialog,
  readFile,
  readWorkspaceTree,
  renameWorkspacePath,
  revealInFileManager,
  saveFileDialog,
  writeFile,
} from "./services/filesystem";
import {
  loadPublicationPresets,
  loadSnippets,
  savePublicationPresets,
  saveSnippets,
} from "./services/user-content";
import { isTauriRuntime } from "./services/runtime";
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS, INITIAL_MARKDOWN, THEMES } from "./constants";
import {
  AppSettings,
  DocumentTab,
  PublicationPreset,
  Snippet,
  Theme,
  WorkspaceNode,
} from "./types";
import { TRANSLATIONS } from "./translations";
import Sidebar from "./app/components/Sidebar";
import EditorTabs from "./app/components/EditorTabs";
import TopChrome from "./app/components/TopChrome";
import WindowTitleBar from "./app/components/WindowTitleBar";
import FindReplaceModal, { FindResult } from "./app/components/FindReplaceModal";
import ExportModal, { ExportFormat } from "./app/components/ExportModal";
import SnippetManagerModal from "./app/components/SnippetManagerModal";
import SettingsPanel from "./app/components/SettingsPanel";
import { useSidebarResize } from "./app/hooks/useSidebarResize";
import CodePreview from "./components/CodePreview";
import { DoorOpen } from "lucide-react";
import "./index.css";

const CODE_FILE_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "jsonc",
  "html",
  "htm",
  "xml",
  "svg",
  "css",
  "scss",
  "sass",
  "less",
  "py",
  "rb",
  "java",
  "c",
  "cpp",
  "cs",
  "php",
  "go",
  "rs",
  "sql",
  "sh",
  "bash",
  "ps1",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "env",
  "txt",
  "log",
]);

function isCodeFile(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  return CODE_FILE_EXTENSIONS.has(extension) && !["md", "markdown"].includes(extension);
}

const markdownLanguage = markdown();
const tsLanguage = javascript({ typescript: true, jsx: true });

interface LocalImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  basePath?: string | null;
}

const LocalImage: React.FC<LocalImageProps> = ({ src, basePath, ...props }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!src) return;
    if (src.startsWith("http") || src.startsWith("data:")) {
      setResolvedSrc(src);
      return;
    }
    if (!isTauriRuntime()) {
      setResolvedSrc(src);
      return;
    }

    let mounted = true;

    const resolve = async () => {
      try {
        let cleanPath = src.replace(/^</, "").replace(/>$/, "");
        if (!cleanPath.match(/^[a-zA-Z]:\\/i) && !cleanPath.startsWith("/") && basePath) {
          const baseDir = basePath.replace(/[/\\][^/\\]*$/, "");
          cleanPath = `${baseDir}/${cleanPath.replace(/^\.\//, "")}`;
        }
        cleanPath = cleanPath.replace(/\//g, "\\");
        const dataUrl = await invoke<string>("load_image", { path: cleanPath });
        if (mounted) setResolvedSrc(dataUrl);
      } catch {
        if (mounted) setResolvedSrc(undefined);
      }
    };

    resolve();
    return () => {
      mounted = false;
    };
  }, [basePath, src]);

  if (!resolvedSrc) return null;
  return <img {...props} src={resolvedSrc} />;
};

function makeNewTab(name = "Untitled.md", content = INITIAL_MARKDOWN): DocumentTab {
  return {
    id: crypto.randomUUID(),
    name,
    path: null,
    content,
    dirty: false,
  };
}

function buildRegex(
  query: string,
  options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }
) {
  if (!query) return null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = options.useRegex ? query : escaped;
  const wrapped = options.wholeWord ? `\\b${source}\\b` : source;
  try {
    return new RegExp(wrapped, options.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

function parseHexColor(value: string) {
  const clean = value.replace("#", "");
  if (clean.length === 6) {
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16),
    };
  }
  if (clean.length === 3) {
    return {
      r: Number.parseInt(clean[0] + clean[0], 16),
      g: Number.parseInt(clean[1] + clean[1], 16),
      b: Number.parseInt(clean[2] + clean[2], 16),
    };
  }
  return null;
}

function relativeLuminance(value: { r: number; g: number; b: number }) {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    if (normalized <= 0.03928) return normalized / 12.92;
    return ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(value.r) +
    0.7152 * linearize(value.g) +
    0.0722 * linearize(value.b)
  );
}

function contrastRatioHex(a: string, b: string) {
  const colorA = parseHexColor(a);
  const colorB = parseHexColor(b);
  if (!colorA || !colorB) return 0;
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureAccessibleColor(
  foreground: string,
  background: string,
  minimumContrast = 10
) {
  const ratio = contrastRatioHex(foreground, background);
  if (ratio >= minimumContrast) return foreground;
  const darkCandidate = "#111827";
  const lightCandidate = "#f8fafc";
  const darkRatio = contrastRatioHex(darkCandidate, background);
  const lightRatio = contrastRatioHex(lightCandidate, background);
  return darkRatio >= lightRatio ? darkCandidate : lightCandidate;
}

function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0;
  const int = Number.parseInt(clean, 16);
  if (Number.isNaN(int)) return 0;
  const rgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function resolveEditorFontFamily(fontFamily: string, fallback: string): string {
  const map: Record<string, string> = {
    theme_default: fallback,
    mono: fallback,
    sans: "'Source Sans 3', 'Segoe UI', sans-serif",
    serif: "'Merriweather', Georgia, serif",
    jetbrains_mono: "'JetBrains Mono', 'Fira Code', monospace",
    fira_code: "'Fira Code', 'JetBrains Mono', monospace",
    cascadia_code: "'Cascadia Code', Consolas, monospace",
    ibm_plex_mono: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    source_code_pro: "'Source Code Pro', 'Fira Code', monospace",
    georgia: "Georgia, 'Times New Roman', serif",
    merriweather: "'Merriweather', Georgia, serif",
  };
  return map[fontFamily] || fallback;
}

function normalizeSnippetKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFsPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .toLowerCase();
}

function isPathInsideWorkspace(path: string, workspacePath: string) {
  const normalizedFile = normalizeFsPath(path);
  const normalizedWorkspace = normalizeFsPath(workspacePath);
  return normalizedFile === normalizedWorkspace || normalizedFile.startsWith(`${normalizedWorkspace}/`);
}

function publicationVariantFor(presetId: string | null | undefined) {
  if (presetId === "paper") return "paper";
  if (presetId === "night") return "night";
  if (presetId === "magazine") return "magazine";
  return "modern";
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { meta: {}, body: content };
  const raw = match[1];
  const meta: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (key) meta[key] = value;
  }
  const body = content.slice(match[0].length);
  return { meta, body };
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [tabs, setTabs] = useState<DocumentTab[]>(() => {
    const restored = loadLastTabs();
    return restored.length > 0 ? restored : [makeNewTab()];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const restored = loadLastTabs();
    return restored[0]?.id ?? null;
  });
  const [, setRecentFiles] = useState(() => getRecentFiles());
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [publicationPresets, setPublicationPresets] = useState<PublicationPreset[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [showZenExit, setShowZenExit] = useState(false);
  const [showShortcutHints, setShowShortcutHints] = useState(false);
  const [viewMode, setViewMode] = useState(settings.viewMode);

  const editorRef = useRef<EditorView | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const zenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const hasWindowControls =
    isTauriRuntime() ||
    (typeof window !== "undefined" && Boolean((window as { DEBUG_SHOW_TITLEBAR?: boolean }).DEBUG_SHOW_TITLEBAR));
  const t = TRANSLATIONS[settings.language] ?? TRANSLATIONS["en-US"];
  const tConfig = THEMES[settings.theme] ?? THEMES[Theme.Sepia];
  const editorFontFamily = resolveEditorFontFamily(settings.fontFamily, tConfig.editorFont);
  const sortedThemes = useMemo(
    () => Object.values(Theme).slice().sort((a, b) => a.localeCompare(b)),
    []
  );
  const isNarrowViewport = viewportWidth < 980;
  const isTinyViewport = viewportWidth < 560;
  const dynamicSidebarMax = Math.max(220, Math.min(520, Math.floor(viewportWidth * 0.45)));

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs]
  );
  const activePublicationPreset = useMemo(
    () =>
      publicationPresets.find((preset) => preset.id === settings.publicationPresetId) ??
      publicationPresets[0] ??
      null,
    [publicationPresets, settings.publicationPresetId]
  );
  const activePublicationVariant = useMemo(
    () => publicationVariantFor(activePublicationPreset?.id),
    [activePublicationPreset?.id]
  );
  const snippetMap = useMemo(() => {
    const map = new Map<string, Snippet>();
    for (const snippet of snippets) {
      const key = normalizeSnippetKey(snippet.trigger || snippet.name);
      if (!key) continue;
      map.set(key, snippet);
    }
    return map;
  }, [snippets]);
  const previewSurfaceStyle = useMemo(() => {
    const preset = activePublicationPreset;
    if (!preset) return undefined;
    const resolvedText = ensureAccessibleColor(preset.palette.text, preset.palette.bg, 4.5);
    const resolvedAccent = ensureAccessibleColor(preset.palette.accent, preset.palette.bg, 10);
    return {
      backgroundColor: preset.palette.bg,
      color: resolvedText,
      fontFamily: preset.typography.fontFamily,
      lineHeight: `${preset.typography.lineHeight}`,
      "--ml-preview-bg": preset.palette.bg,
      "--ml-preview-text": resolvedText,
      "--ml-preview-accent": resolvedAccent,
      "--ml-preview-muted": preset.palette.muted,
      "--ml-preview-line-height": `${preset.typography.lineHeight}`,
    } as React.CSSProperties;
  }, [activePublicationPreset]);

  const activeContent = activeTab?.content ?? "";
  const isCodeDocument = activeTab ? isCodeFile(activeTab.name) : false;
  const editorExtensions = useMemo(() => {
    const tryExpandSnippet = (view: EditorView) => {
      const selection = view.state.selection.main;
      if (!selection.empty) return false;
      const line = view.state.doc.lineAt(selection.from);
      const text = line.text.trim();
      const match = text.match(/^(?:>?\s*snip:|\/snip\s+)([a-z0-9_\- ]+)$/i);
      if (!match) return false;
      const trigger = normalizeSnippetKey(match[1] || "");
      const snippet = snippetMap.get(trigger);
      if (!snippet) return false;

      view.dispatch({
        changes: { from: line.from, to: line.to, insert: snippet.content },
        selection: EditorSelection.cursor(line.from + snippet.content.length),
      });
      return true;
    };

    const snippetCommandExtension = keymap.of([
      { key: "Enter", run: tryExpandSnippet },
      { key: "Tab", run: tryExpandSnippet },
    ]);

    const core = [
      history(),
      snippetCommandExtension,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      lineNumbers(),
      EditorState.allowMultipleSelections.of(false),
      EditorView.lineWrapping,
    ];
    if (isCodeDocument) return [...core, tsLanguage];
    return [...core, markdownLanguage];
  }, [isCodeDocument, snippetMap]);

  const { width: sidebarWidth, isResizing, feedbackWidth, handleProps } = useSidebarResize({
    initialWidth: settings.sidebarWidth,
    minWidth: 180,
    maxWidth: dynamicSidebarMax,
    onResizeEnd: (width) => updateSettings({ sidebarWidth: width }),
  });
  const clampedSidebarWidth = Math.min(sidebarWidth, dynamicSidebarMax);
  const effectiveViewMode: "edit" | "split" | "preview" =
    isNarrowViewport && viewMode === "split" ? "edit" : viewMode;

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      saveSettings(next);
      return next;
    });
  };

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (settings.sidebarWidth > dynamicSidebarMax) {
      updateSettings({ sidebarWidth: dynamicSidebarMax });
    }
  }, [dynamicSidebarMax, settings.sidebarWidth]);

  const cycleTheme = () => {
    const currentIndex = sortedThemes.indexOf(settings.theme);
    const nextTheme = sortedThemes[(currentIndex + 1 + sortedThemes.length) % sortedThemes.length];
    updateSettings({ theme: nextTheme });
  };

  const createNewTabInCurrentWindow = () => {
    const next = makeNewTab("Untitled.md", "");
    setTabs((previous) => [...previous, next]);
    setActiveTabId(next.id);
  };

  const updateActiveTabContent = (content: string) => {
    if (!activeTab) return;
    setTabs((previous) =>
      previous.map((tab) =>
        tab.id === activeTab.id ? { ...tab, content, dirty: tab.dirty || content !== tab.content } : tab
      )
    );
  };

  const openPathInTab = async (path: string) => {
    try {
      const content = await readFile(path);
      const name = path.split(/[\\/]/).pop() || "Untitled.md";
      const existing = tabs.find((tab) => tab.path === path);
      if (existing) {
        setActiveTabId(existing.id);
        setTabs((previous) =>
          previous.map((tab) =>
            tab.id === existing.id ? { ...tab, content, name, dirty: false } : tab
          )
        );
      } else {
        const next: DocumentTab = {
          id: crypto.randomUUID(),
          name,
          path,
          content,
          dirty: false,
        };
        setTabs((previous) => [...previous, next]);
        setActiveTabId(next.id);
      }
      addRecentFile(path, name);
      setRecentFiles(getRecentFiles());

      if (!workspacePath) {
        // Fallback to setting the file's directory as the workspace
        const dir = path.substring(0, Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")));
        if (dir) {
          setWorkspacePath(dir);
          saveWorkspacePath(dir);
          try {
            const tree = await readWorkspaceTree(dir);
            setWorkspaceTree(tree);
          } catch (e) {
            console.error("Failed to load generic workspace", e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };

  const closeTabWithPrompt = async (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;
    if (tab.dirty) {
      const shouldSave = window.confirm(
        (t["confirm.unsaved.message"] || "")
          .replace("{fileName}", tab.name)
          .trim() || `Save changes for ${tab.name}?`
      );
      if (shouldSave) {
        await saveTab(tab, false);
      }
    }
    setTabs((previous) => previous.filter((item) => item.id !== tabId));
    if (activeTabId === tabId) {
      const index = tabs.findIndex((item) => item.id === tabId);
      const fallback = tabs[index - 1] || tabs[index + 1];
      setActiveTabId(fallback?.id ?? null);
    }
  };

  const saveTab = async (tab: DocumentTab, forceSaveAs: boolean) => {
    try {
      let path = tab.path;
      if (!path || forceSaveAs) {
        const selected = await saveFileDialog(tab.name || "Untitled.md");
        if (!selected) return;
        path = selected;
      }

      await writeFile(path, tab.content);
      const name = path.split(/[\\/]/).pop() || tab.name;
      setTabs((previous) =>
        previous.map((item) =>
          item.id === tab.id ? { ...item, path, name, dirty: false } : item
        )
      );
      addRecentFile(path, name);
      setRecentFiles(getRecentFiles());

      if (workspacePath && isPathInsideWorkspace(path, workspacePath)) {
        await refreshWorkspace();
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const handleNewFile = async () => {
    if (!settings.singleInstance) {
      if (isTauriRuntime()) {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const label = `editor-${Date.now()}`;
        new WebviewWindow(label, {
          url: "index.html",
          title: "Mark-Lee",
          width: 1200,
          height: 800,
        });
      } else {
        createNewTabInCurrentWindow();
      }
      return;
    }

    if (activeTab?.dirty) {
      const shouldSave = window.confirm(
        (t["confirm.unsaved.message"] || "").replace("{fileName}", activeTab.name)
      );
      if (shouldSave) await saveTab(activeTab, false);
    }

    if (settings.tabsEnabled) {
      createNewTabInCurrentWindow();
    } else {
      const next = makeNewTab("Untitled.md", "");
      setTabs([next]);
      setActiveTabId(next.id);
    }
  };

  const handleOpenFile = async () => {
    const selected = await openFileDialog();
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    await openPathInTab(path);
  };

  const handleOpenFolder = async () => {
    const selected = await openFileDialog({ directory: true, multiple: false });
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;
    setWorkspacePath(path);
    saveWorkspacePath(path);
    try {
      const tree = await readWorkspaceTree(path);
      setWorkspaceTree(tree);
    } catch (error) {
      console.error("Failed to read workspace tree:", error);
    }
  };

  const refreshWorkspace = async () => {
    if (!workspacePath) return;
    try {
      const tree = await readWorkspaceTree(workspacePath);
      setWorkspaceTree(tree);
    } catch (error) {
      console.error("Failed to refresh workspace:", error);
    }
  };

  const handleWorkspaceCreateFile = async (basePath: string) => {
    const name = window.prompt("New file name");
    if (!name) return;
    await createWorkspaceFile(`${basePath}/${name}`);
    await refreshWorkspace();
  };

  const handleWorkspaceCreateFolder = async (basePath: string) => {
    const name = window.prompt("New folder name");
    if (!name) return;
    await createWorkspaceDirectory(`${basePath}/${name}`);
    await refreshWorkspace();
  };

  const handleWorkspaceRename = async (path: string) => {
    const currentName = path.split(/[\\/]/).pop() || path;
    const name = window.prompt("Rename", currentName);
    if (!name || name === currentName) return;
    const basePath = path.replace(/[/\\][^/\\]+$/, "");
    await renameWorkspacePath(path, `${basePath}/${name}`);
    await refreshWorkspace();
  };

  const handleWorkspaceDelete = async (path: string) => {
    const ok = window.confirm("Delete selected item?");
    if (!ok) return;
    await deleteWorkspacePath(path);
    await refreshWorkspace();
  };

  const applyWrapSelection = (before: string, after = before) => {
    const view = editorRef.current;
    if (!view) return;
    const selection = view.state.selection.main;
    const selected = view.state.doc.sliceString(selection.from, selection.to);
    const next = `${before}${selected}${after}`;
    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: next },
      selection: EditorSelection.cursor(selection.from + before.length + selected.length),
    });
    view.focus();
  };

  const applyLinePrefix = (prefix: string) => {
    const view = editorRef.current;
    if (!view) return;
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.from);
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
      selection: EditorSelection.cursor(selection.from + prefix.length),
    });
    view.focus();
  };

  const handleFormatAction = async (
    action: "bold" | "italic" | "code" | "link" | "image" | "ul" | "ol" | "task"
  ) => {
    switch (action) {
      case "bold":
        applyWrapSelection("**", "**");
        break;
      case "italic":
        applyWrapSelection("*", "*");
        break;
      case "code":
        applyWrapSelection("`", "`");
        break;
      case "link":
        applyWrapSelection("[", "](https://example.com)");
        break;
      case "image": {
        const selected = await openFileDialog({
          multiple: false,
          filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
        });
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (!path) return;
        if (!activeTab?.path) {
          window.alert(t["image.saveFirst"] || "Save the document before inserting images.");
          return;
        }
        let markdownPath = path.replace(/\\/g, "/");
        if (isTauriRuntime()) {
          try {
            markdownPath = await copyImageToDocumentDir(path, activeTab.path);
          } catch (error) {
            console.error("Failed to copy image next to document:", error);
          }
        }
        if (!markdownPath.startsWith("./") && !markdownPath.startsWith("/") && !markdownPath.match(/^[a-zA-Z]+:/)) {
          markdownPath = `./${markdownPath}`;
        }
        applyWrapSelection(`![Image](${markdownPath})`, "");
        break;
      }
      case "ul":
        applyLinePrefix("- ");
        break;
      case "ol":
        applyLinePrefix("1. ");
        break;
      case "task":
        applyLinePrefix("- [ ] ");
        break;
      default:
        break;
    }
  };

  const handleFindSelect = (result: FindResult) => {
    const view = editorRef.current;
    if (!view) return;
    const anchor = result.index;
    const head = result.index + result.length;
    view.dispatch({
      selection: EditorSelection.range(anchor, head),
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
    });
    view.focus();
  };

  const handleReplaceOne = (
    query: string,
    replacement: string,
    options: AppSettings["findReplace"]
  ) => {
    if (!activeTab) return;
    const regex = buildRegex(query, options);
    if (!regex) return;
    const match = activeTab.content.match(regex);
    if (match?.index === undefined) return;
    const next =
      activeTab.content.slice(0, match.index) +
      replacement +
      activeTab.content.slice(match.index + match[0].length);
    updateActiveTabContent(next);
  };

  const handleReplaceAll = (
    query: string,
    replacement: string,
    options: AppSettings["findReplace"]
  ) => {
    if (!activeTab) return;
    const regex = buildRegex(query, options);
    if (!regex) return;
    updateActiveTabContent(activeTab.content.replace(regex, replacement));
  };

  const handleExport = async (format: ExportFormat) => {
    if (!activeTab) return;
    if (format === "pdf") {
      window.print();
      return;
    }

    let output = activeTab.content;
    let suggestedName = activeTab.name;

    if (format === "markdown_formatted") {
      output = formatMarkdown(activeTab.content);
      suggestedName = suggestedName.replace(/\.md$/i, "_formatted.md");
    } else if (format === "markdown_minified") {
      output = minifyMarkdown(activeTab.content);
      suggestedName = suggestedName.replace(/\.md$/i, "_minified.md");
    } else if (format === "html") {
      suggestedName = suggestedName.replace(/\.md$/i, ".html");
      const preset = activePublicationPreset;
      const variant = publicationVariantFor(preset?.id);
      const resolvedText = preset
        ? ensureAccessibleColor(preset.palette.text, preset.palette.bg, 4.5)
        : "#111827";
      const resolvedAccent = preset
        ? ensureAccessibleColor(preset.palette.accent, preset.palette.bg, 4.5)
        : "#172554";
      const layoutStyle =
        variant === "paper"
          ? "max-width: 760px; margin: 0 auto; letter-spacing: 0.01em;"
          : variant === "night"
            ? "max-width: 880px; margin: 0 auto; font-size: 1.02rem;"
            : variant === "magazine"
              ? "max-width: 980px; margin: 0 auto; column-gap: 2.2rem;"
              : "max-width: 860px; margin: 0 auto;";
      const presetStyle = preset
        ? `<style>
            body {
              margin: 0;
              padding: 2rem;
              background: ${preset.palette.bg};
              color: ${resolvedText};
              font-family: ${preset.typography.fontFamily};
              line-height: ${preset.typography.lineHeight};
            }
            main { ${layoutStyle} }
            a { color: ${resolvedAccent}; font-weight: 700; text-decoration-thickness: 2px; }
            blockquote { border-left: 4px solid ${preset.palette.muted}; padding-left: 1rem; }
          </style>`
        : "";
      output = `<!doctype html><html><head><meta charset="UTF-8" /><title>${activeTab.name}</title>${presetStyle}</head><body>${`<main>${previewRef.current?.innerHTML || ""}</main>`
        }</body></html>`;
    }

    const path = await saveFileDialog(suggestedName);
    if (!path) return;
    await writeFile(path, output);
    setShowExport(false);
  };

  const closeRightTabs = (tabId: string) => {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    const keep = tabs.slice(0, index + 1);
    setTabs(keep);
    setActiveTabId(tabId);
  };

  const closeSavedTabs = () => {
    const dirtyTabs = tabs.filter((tab) => tab.dirty);
    setTabs(dirtyTabs.length > 0 ? dirtyTabs : [makeNewTab()]);
    setActiveTabId(dirtyTabs[0]?.id ?? null);
  };

  const closeAllTabs = () => {
    setTabs([makeNewTab("Untitled.md", "")]);
    setActiveTabId((current) => current ?? tabs[0]?.id ?? null);
  };

  useEffect(() => {
    if (!activeTabId && tabs.length > 0) setActiveTabId(tabs[0].id);
    if (tabs.length === 0) {
      const next = makeNewTab();
      setTabs([next]);
      setActiveTabId(next.id);
    }
    saveLastTabs(tabs);
  }, [activeTabId, tabs]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const title = activeTab ? `${activeTab.name}${activeTab.dirty ? "*" : ""} - Mark-Lee` : "Mark-Lee";
    if (isTauriRuntime()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => getCurrentWindow().setTitle(title))
        .catch(() => undefined);
    }
    document.title = title;
  }, [activeTab]);

  useEffect(() => {
    const loadStartupData = async () => {
      const [loadedSnippets, loadedPresets] = await Promise.all([
        loadSnippets(),
        loadPublicationPresets(),
      ]);
      setSnippets(loadedSnippets);
      setPublicationPresets(loadedPresets);
      setSettings((previous) => {
        const exists = loadedPresets.some((preset) => preset.id === previous.publicationPresetId);
        if (exists) return previous;
        const next = {
          ...previous,
          publicationPresetId: loadedPresets[0]?.id ?? DEFAULT_SETTINGS.publicationPresetId,
        };
        saveSettings(next);
        return next;
      });

      // Restore last workspace
      const storedWorkspace = loadWorkspacePath();
      if (storedWorkspace) {
        setWorkspacePath(storedWorkspace);
        try {
          const tree = await readWorkspaceTree(storedWorkspace);
          setWorkspaceTree(tree);
        } catch {
          // Folder may no longer exist
          saveWorkspacePath(null);
        }
      }
    };
    loadStartupData();
  }, []);

  // Suppress default browser/Tauri context menu
  useEffect(() => {
    const suppress = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", suppress);
    return () => window.removeEventListener("contextmenu", suppress);
  }, []);

  useEffect(() => {
    saveSnippets(snippets).catch(() => undefined);
  }, [snippets]);

  useEffect(() => {
    savePublicationPresets(publicationPresets).catch(() => undefined);
  }, [publicationPresets]);

  useEffect(() => {
    const anchor = settings.floatingToolbarAnchor;
    const byAnchor = settings.toolbarByAnchor ?? {};
    const saved = byAnchor[anchor];
    if (!saved) return;
    const nextPatch: Partial<AppSettings> = {};
    if (saved.showToolbarSectionLabels !== settings.showToolbarSectionLabels) {
      nextPatch.showToolbarSectionLabels = saved.showToolbarSectionLabels;
    }
    if (saved.toolbarCompactBreakpoint !== settings.toolbarCompactBreakpoint) {
      nextPatch.toolbarCompactBreakpoint = saved.toolbarCompactBreakpoint;
    }
    if (saved.toolbarDisplayMode !== settings.toolbarDisplayMode) {
      nextPatch.toolbarDisplayMode = saved.toolbarDisplayMode;
    }
    if (JSON.stringify(saved.toolbarSections) !== JSON.stringify(settings.toolbarSections)) {
      nextPatch.toolbarSections = saved.toolbarSections;
    }
    if (JSON.stringify(saved.toolbarItems) !== JSON.stringify(settings.toolbarItems)) {
      nextPatch.toolbarItems = saved.toolbarItems;
    }
    if (Object.keys(nextPatch).length > 0) updateSettings(nextPatch);
  }, [settings.floatingToolbarAnchor]);

  useEffect(() => {
    const anchor = settings.floatingToolbarAnchor;
    const previous = settings.toolbarByAnchor ?? {};
    const nextAnchorLayout = {
      showToolbarSectionLabels: settings.showToolbarSectionLabels,
      toolbarCompactBreakpoint: settings.toolbarCompactBreakpoint,
      toolbarDisplayMode: settings.toolbarDisplayMode,
      toolbarSections: settings.toolbarSections,
      toolbarItems: settings.toolbarItems,
    };
    if (JSON.stringify(previous[anchor]) === JSON.stringify(nextAnchorLayout)) return;
    updateSettings({
      toolbarByAnchor: {
        ...previous,
        [anchor]: nextAnchorLayout,
      },
    });
  }, [
    settings.floatingToolbarAnchor,
    settings.showToolbarSectionLabels,
    settings.toolbarCompactBreakpoint,
    settings.toolbarDisplayMode,
    settings.toolbarItems,
    settings.toolbarSections,
  ]);

  useEffect(() => {
    if (publicationPresets.length === 0) return;
    if (publicationPresets.some((preset) => preset.id === settings.publicationPresetId)) return;
    updateSettings({ publicationPresetId: publicationPresets[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicationPresets, settings.publicationPresetId]);

  useEffect(() => {
    const loadFromCli = async () => {
      if (!isTauriRuntime()) return;
      try {
        const { getMatches } = await import("@tauri-apps/plugin-cli");
        const matches = await getMatches();
        const fileArg = matches.args.file;
        if (fileArg?.value && typeof fileArg.value === "string") {
          await openPathInTab(fileArg.value);
        }
      } catch {
        // no-op
      }
    };
    loadFromCli();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isZenMode) {
      setShowZenExit(false);
      if (zenTimerRef.current) clearTimeout(zenTimerRef.current);
      return;
    }

    const onMouseMove = () => {
      setShowZenExit(true);
      if (zenTimerRef.current) clearTimeout(zenTimerRef.current);
      zenTimerRef.current = setTimeout(() => setShowZenExit(false), 1500);
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (zenTimerRef.current) clearTimeout(zenTimerRef.current);
    };
  }, [isZenMode]);

  const shortcutLabels = useMemo(
    () => ({ ...DEFAULT_SHORTCUTS, ...(settings.customShortcuts ?? {}) }),
    [settings.customShortcuts]
  );

  useEffect(() => {
    const getShortcut = (key: string, fallback: string) => shortcutLabels[key] || fallback;

    const normalize = (value: string) => value.toUpperCase().split("+");
    const testShortcut = (event: KeyboardEvent, shortcut: string) => {
      const parts = normalize(shortcut);
      const key = parts[parts.length - 1];
      const ctrl = parts.includes("CTRL");
      const shift = parts.includes("SHIFT");
      const alt = parts.includes("ALT");
      const eventKey = event.key.toUpperCase();
      return event.ctrlKey === ctrl && event.shiftKey === shift && event.altKey === alt && eventKey === key;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (testShortcut(event, getShortcut("file-save", "CTRL+S"))) {
        event.preventDefault();
        if (activeTab) saveTab(activeTab, false);
      } else if (testShortcut(event, getShortcut("file-save-as", "CTRL+SHIFT+S"))) {
        event.preventDefault();
        if (activeTab) saveTab(activeTab, true);
      } else if (testShortcut(event, getShortcut("file-open", "CTRL+O"))) {
        event.preventDefault();
        handleOpenFile();
      } else if (testShortcut(event, getShortcut("file-open-folder", "CTRL+SHIFT+O"))) {
        event.preventDefault();
        handleOpenFolder();
      } else if (testShortcut(event, getShortcut("file-new", "CTRL+N"))) {
        event.preventDefault();
        handleNewFile();
      } else if (testShortcut(event, getShortcut("file-export", "CTRL+E"))) {
        event.preventDefault();
        setShowExport(true);
      } else if (testShortcut(event, getShortcut("edit-find", "CTRL+F"))) {
        event.preventDefault();
        setShowFindReplace(true);
      } else if (testShortcut(event, getShortcut("edit-replace", "CTRL+H"))) {
        event.preventDefault();
        setShowFindReplace(true);
      } else if (testShortcut(event, getShortcut("edit-snippets", "CTRL+J"))) {
        event.preventDefault();
        setShowSnippets(true);
      } else if (testShortcut(event, getShortcut("view-sidebar", "CTRL+B"))) {
        event.preventDefault();
        updateSettings({ sidebarEnabled: !settings.sidebarEnabled });
      } else if (testShortcut(event, getShortcut("help-shortcuts", "F1"))) {
        event.preventDefault();
        setShowShortcutHints((previous) => !previous);
      } else if (testShortcut(event, getShortcut("view-edit", "CTRL+1"))) {
        event.preventDefault();
        setViewMode("edit");
        updateSettings({ viewMode: "edit" });
      } else if (testShortcut(event, getShortcut("view-split", "CTRL+2"))) {
        event.preventDefault();
        setViewMode("split");
        updateSettings({ viewMode: "split" });
      } else if (testShortcut(event, getShortcut("view-preview", "CTRL+3"))) {
        event.preventDefault();
        setViewMode("preview");
        updateSettings({ viewMode: "preview" });
      } else if (testShortcut(event, getShortcut("view-zen", "F10"))) {
        event.preventDefault();
        setIsZenMode((previous) => !previous);
      } else if (testShortcut(event, getShortcut("view-theme-cycle", "CTRL+SHIFT+T"))) {
        event.preventDefault();
        cycleTheme();
      } else if (testShortcut(event, getShortcut("app-settings", "CTRL+,"))) {
        event.preventDefault();
        setShowSettings(true);
      } else if (testShortcut(event, getShortcut("fmt-bold", "CTRL+SHIFT+B"))) {
        event.preventDefault();
        handleFormatAction("bold");
      } else if (testShortcut(event, getShortcut("fmt-italic", "CTRL+I"))) {
        event.preventDefault();
        handleFormatAction("italic");
      } else if (testShortcut(event, getShortcut("fmt-link", "CTRL+K"))) {
        event.preventDefault();
        handleFormatAction("link");
      } else if (testShortcut(event, getShortcut("fmt-ul", "CTRL+SHIFT+8"))) {
        event.preventDefault();
        handleFormatAction("ul");
      } else if (testShortcut(event, getShortcut("fmt-ol", "CTRL+SHIFT+7"))) {
        event.preventDefault();
        handleFormatAction("ol");
      } else if (testShortcut(event, getShortcut("fmt-task", "CTRL+SHIFT+9"))) {
        event.preventDefault();
        handleFormatAction("task");
      } else if (event.key === "Escape") {
        setShowShortcutHints(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, handleFormatAction, settings, shortcutLabels, tabs]);

  useEffect(() => {
    if (!settings.autoSave || !activeTab?.dirty || !activeTab.path) return;
    const timer = setInterval(() => {
      const fresh = tabs.find((item) => item.id === activeTab.id);
      if (!fresh?.path || !fresh.dirty) return;
      writeFile(fresh.path, fresh.content)
        .then(() => {
          setTabs((previous) =>
            previous.map((item) => (item.id === fresh.id ? { ...item, dirty: false } : item))
          );
        })
        .catch(() => undefined);
    }, settings.autoSaveInterval * 1000);
    return () => clearInterval(timer);
  }, [activeTab, settings.autoSave, settings.autoSaveInterval, tabs]);

  const topChromeComponent = (
    <TopChrome
      t={t}
      tConfig={tConfig}
      floatingToolbarAnchor={settings.floatingToolbarAnchor}
      sidebarEnabled={settings.sidebarEnabled}
      viewMode={effectiveViewMode}
      toolbarSections={settings.toolbarSections}
      toolbarItems={settings.toolbarItems}
      showToolbarSectionLabels={settings.showToolbarSectionLabels}
      toolbarCompactBreakpoint={settings.toolbarCompactBreakpoint}
      toolbarDisplayMode={settings.toolbarDisplayMode}
      shortcutLabels={shortcutLabels}
      showShortcutHints={showShortcutHints}
      onToolbarSectionChange={(section, enabled) =>
        updateSettings({
          toolbarSections: {
            ...settings.toolbarSections,
            [section]: section === "system" ? true : enabled,
          },
        })
      }
      onNewFile={handleNewFile}
      onOpenFile={handleOpenFile}
      onOpenFolder={handleOpenFolder}
      onSave={() => activeTab && saveTab(activeTab, false)}
      onExport={() => setShowExport(true)}
      onFindReplace={() => setShowFindReplace(true)}
      onOpenSettings={() => setShowSettings(true)}
      onOpenSnippets={() => setShowSnippets(true)}
      onCycleTheme={cycleTheme}
      onToggleSidebar={() => updateSettings({ sidebarEnabled: !settings.sidebarEnabled })}
      onToggleZen={() => setIsZenMode((previous) => !previous)}
      onViewModeChange={(mode) => {
        setViewMode(mode);
        updateSettings({ viewMode: mode });
      }}
      onFormatAction={handleFormatAction}
    />
  );
  const topChromeBlock =
    !isZenMode && settings.floatingToolbarAnchor === "top" && settings.sidebarEnabled ? (
      <div className="relative">
        {topChromeComponent}
        <div
          className={`pointer-events-none absolute top-0 bottom-0 w-px ${tConfig.uiBorder} opacity-90`}
          style={{ left: `${Math.max(0, clampedSidebarWidth - 1)}px` }}
        />
      </div>
    ) : (
      topChromeComponent
    );

  return (
    <div
      data-theme={settings.theme}
      className={`h-screen w-screen overflow-hidden rounded-[8px] flex flex-col transition-colors duration-300 ${tConfig.bg} ${tConfig.fg}`}
      style={
        {
          backgroundColor: tConfig.bgHex,
          fontFamily: tConfig.uiFont,
          color: tConfig.fgHex,
          "--ml-editor-font": editorFontFamily,
          "--ml-editor-font-size": `${settings.fontSize}px`,
          "--ml-editor-line-height": `${settings.lineHeight}`,
          "--ml-editor-bg": tConfig.editorBgHex,
          "--ml-editor-fg": tConfig.editorFgHex,
          "--ml-fg": tConfig.fgHex,
          "--ml-bg": tConfig.bgHex,
          "--ml-ui": tConfig.uiHex,
          boxShadow: "inset 0 1px 2px 0 rgba(255, 255, 255, 0.1)",
        } as React.CSSProperties
      }
    >
      <WindowTitleBar tConfig={tConfig} />
      {!isZenMode && (
        <div
          className={`h-8 border-b ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg} px-2 flex items-center justify-between`}
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <div
            className="flex items-center gap-2 min-w-0"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <img src="/img/logo.png" alt="Mark-Lee" className={`h-6 w-6 rounded border ${tConfig.uiBorder}`} />
            <span className="text-sm font-semibold tracking-wide whitespace-nowrap">Mark-Lee</span>
          </div>
          <div className={`${hasWindowControls ? "w-[132px]" : "w-0"} shrink-0 pointer-events-none`} />
        </div>
      )}
      {!isZenMode && settings.floatingToolbarAnchor !== "bottom" && topChromeBlock}

      <div
        className={`flex-1 min-h-0 flex ${!isZenMode && settings.floatingToolbarAnchor === "left" ? "pl-[72px]" : ""
          } ${!isZenMode && settings.floatingToolbarAnchor === "right" ? "pr-[72px]" : ""
          } ${!isZenMode && settings.floatingToolbarAnchor === "bottom" ? "pb-[52px]" : ""}`}
      >
        {!isZenMode && settings.sidebarEnabled && (
          <div
            style={{ width: `${clampedSidebarWidth}px`, minWidth: "180px", maxWidth: `${dynamicSidebarMax}px` }}
            className={`relative h-full border-r ${tConfig.uiBorder}`}
          >
            <div className="h-full">
              <Sidebar
                t={t}
                tConfig={tConfig}
                workspacePath={workspacePath}
                workspaceTree={workspaceTree}
                onOpenFolder={handleOpenFolder}
                onOpenFile={openPathInTab}
                onCreateFile={handleWorkspaceCreateFile}
                onCreateFolder={handleWorkspaceCreateFolder}
                onRename={handleWorkspaceRename}
                onDelete={handleWorkspaceDelete}
                onReveal={revealInFileManager}
              />
            </div>
            <div
              {...handleProps}
              className="absolute top-0 -right-[6px] z-[150] h-full w-3 transition-all duration-150 group"
            >
              <div
                className={`absolute left-1/2 top-0 -translate-x-1/2 h-full rounded-full transition-all duration-150 ${isResizing ? "bg-indigo-500/40" : "bg-transparent"
                  }`}
                style={{ width: `${isResizing ? feedbackWidth : 0}px` }}
              />
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-indigo-500/40" />
            </div>
          </div>
        )}

        <div
          className={`flex-1 min-w-0 h-full flex flex-col ${tConfig.editorBg} ${tConfig.editorFg}`}
        >
          {!isZenMode && settings.tabsEnabled && (
            <EditorTabs
              tabs={tabs}
              activeTabId={activeTabId}
              t={t}
              tConfig={tConfig}
              onActivate={setActiveTabId}
              onClose={closeTabWithPrompt}
              onCloseOthers={(tabId) => {
                setTabs((previous) => previous.filter((tab) => tab.id === tabId));
                setActiveTabId(tabId);
              }}
              onCloseRight={closeRightTabs}
              onCloseSaved={closeSavedTabs}
              onCloseAll={closeAllTabs}
              onNewTab={createNewTabInCurrentWindow}
            />
          )}

          <div className="flex-1 min-h-0 h-full flex flex-row">
            <div
              className={`${effectiveViewMode === "preview" ? "hidden" : "block"
                } ${effectiveViewMode === "split" ? "w-1/2 border-r" : "w-full"} ${tConfig.uiBorder} min-h-0 h-full`}
            >
              <CodeMirror
                value={activeContent}
                height="100%"
                className="h-full"
                extensions={editorExtensions}
                onChange={(value) => {
                  updateActiveTabContent(value);
                }}
                basicSetup={{
                  foldGutter: true,
                  highlightActiveLine: true,
                }}
                theme={hexLuminance(tConfig.editorBgHex) > 0.33 ? "light" : "dark"}
                onCreateEditor={(view) => {
                  editorRef.current = view;
                }}
              />
            </div>

            <div
              ref={previewRef}
              className={`${effectiveViewMode === "edit" ? "hidden" : "block"
                } ${effectiveViewMode === "split" ? "w-1/2 border-l" : "w-full"} ${tConfig.uiBorder} overflow-y-auto overflow-x-hidden min-h-0 h-full`}
              style={{ backgroundColor: tConfig.bgHex }}
            >
              {isCodeDocument ? (
                <CodePreview content={activeContent} fileName={activeTab?.name ?? "Untitled.ts"} tConfig={tConfig} />
              ) : (() => {
                const { meta, body } = parseFrontmatter(activeContent);
                const hasMeta = Object.keys(meta).length > 0;
                return (
                  <div
                    className="min-h-full p-5"
                    style={{ backgroundColor: tConfig.bgHex }}
                  >
                    <div
                      className={`ml-preview-surface ml-preview-${activePublicationVariant} mx-auto`}
                      style={previewSurfaceStyle}
                      data-preview-variant={activePublicationVariant}
                    >
                      {hasMeta && (
                        <div
                          className="ml-frontmatter-card mb-6 rounded-lg border px-5 py-4"
                          style={{
                            borderColor: "color-mix(in srgb, var(--ml-preview-text, #111827) 20%, transparent)",
                            background: "color-mix(in srgb, var(--ml-preview-text, #111827) 5%, transparent)",
                          }}
                        >
                          <div
                            className="text-[10px] font-bold uppercase tracking-widest mb-2"
                            style={{ color: "var(--ml-preview-muted, #64748b)", opacity: 0.7 }}
                          >
                            Metadata
                          </div>
                          <dl className="grid gap-x-4 gap-y-1" style={{ gridTemplateColumns: "auto 1fr" }}>
                            {Object.entries(meta).map(([key, value]) => (
                              <React.Fragment key={key}>
                                <dt
                                  className="text-xs font-semibold capitalize"
                                  style={{ color: "var(--ml-preview-muted, #64748b)" }}
                                >
                                  {key}
                                </dt>
                                <dd className="text-xs" style={{ color: "var(--ml-preview-text, #111827)" }}>
                                  {value}
                                </dd>
                              </React.Fragment>
                            ))}
                          </dl>
                        </div>
                      )}
                      <div className="ml-preview-prose">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            img: (props) => (
                              <LocalImage
                                {...props}
                                className="max-w-full h-auto rounded-md"
                                basePath={activeTab?.path ?? null}
                              />
                            ),
                          }}
                        >
                          {body}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {!isZenMode && (
            <div className={`h-8 border-t ${tConfig.uiBorder} ${tConfig.ui} px-3 text-xs flex items-center justify-between`}>
              <div>
                {activeTab?.name}
                {activeTab?.dirty ? "*" : ""}
              </div>
              <div className="flex items-center gap-4">
                <span>{tabs.length} tabs</span>
                {!isTinyViewport && <span>{workspacePath ? workspacePath.split(/[\\/]/).pop() : "-"}</span>}
                <span>{effectiveViewMode}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {!isZenMode && settings.floatingToolbarAnchor === "bottom" && topChromeComponent}

      {isZenMode && showZenExit && (
        <button
          type="button"
          title={t["view.zen.exit"] || "Exit Zen mode"}
          onClick={() => setIsZenMode(false)}
          className="fixed top-3 right-3 z-[200] h-9 w-9 rounded-full border ml-btn-primary inline-flex items-center justify-center"
        >
          <DoorOpen size={16} />
        </button>
      )}

      <FindReplaceModal
        open={showFindReplace}
        t={t}
        tConfig={tConfig}
        content={activeContent}
        options={settings.findReplace}
        onClose={() => setShowFindReplace(false)}
        onOptionsChange={(options) => updateSettings({ findReplace: options })}
        onSelectResult={handleFindSelect}
        onReplaceOne={handleReplaceOne}
        onReplaceAll={handleReplaceAll}
      />

      <ExportModal
        open={showExport}
        t={t}
        tConfig={tConfig}
        onClose={() => setShowExport(false)}
        onConfirm={handleExport}
      />

      <SnippetManagerModal
        open={showSnippets}
        snippets={snippets}
        t={t}
        tConfig={tConfig}
        onClose={() => setShowSnippets(false)}
        onInsert={(snippet) => {
          const view = editorRef.current;
          if (!view) return;
          const selection = view.state.selection.main;
          view.dispatch({
            changes: {
              from: selection.from,
              to: selection.to,
              insert: snippet.content,
            },
          });
          view.focus();
          setShowSnippets(false);
        }}
        onChange={setSnippets}
      />

      <SettingsPanel
        open={showSettings}
        settings={settings}
        t={t}
        tConfig={tConfig}
        publicationPresets={publicationPresets}
        onClose={() => setShowSettings(false)}
        onSettingsChange={updateSettings}
        onPublicationPresetsChange={setPublicationPresets}
      />
    </div>
  );
}

export default App;
