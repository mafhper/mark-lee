export type ViewMode = 'split' | 'edit' | 'preview';

export enum Theme {
  Coffee = 'coffee',
  Light = 'light',
  Dark = 'dark',
  Forest = 'forest',
  Golden = 'golden',
  Midnight = 'midnight',
  Neomatrix = 'neomatrix',
  Nord = 'nord',
  Sepia = 'sepia',
  Synthwave = 'synthwave',
  Terminal = 'terminal',
  Firenight = 'firenight',
}

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

export interface ThemeConfig {
  bg: string; // Tailwind class for solid, used for reference
  bgHex: string; // Hex value for opacity manipulation
  fg: string;
  fgHex: string;
  ui: string;
  uiHex: string;
  uiBorder: string;
  editorBg: string; // Tailwind class
  editorBgHex: string; // Hex for opacity
  editorFg: string;
  editorFgHex: string;
  accent: string;
  prose: string; // Tailwind prose class suffix
  uiFont: string;
  editorFont: string;
}

export type EditorAction =
  | 'bold'
  | 'italic'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'code'
  | 'link'
  | 'image'
  | 'list-ul'
  | 'list-ol'
  | 'check';

export interface AppSettings {
  language: Language;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  wordWrap: boolean;
  typewriterMode: boolean;
  spellCheck: boolean;
  transparency: number; // 0.1 to 1.0
  singleInstance: boolean; // true = reuse window, false = new window per file
  autoSave: boolean; // Enable auto-save
  autoSaveInterval: number; // Auto-save interval in seconds (30-300)
  focusMode: boolean; // Dim everything except current paragraph
  customShortcuts?: Record<string, string>; // Action ID -> Shortcut string (e.g. "Ctrl+S")
  presetId: string; // ID of the active text styling preset
  publicationPresetId: string; // ID of the active publication preset
  toolbarPosition: 'top' | 'bottom' | 'left' | 'right';
  chromeMode: 'unified';
  tabsEnabled: boolean;
  sidebarEnabled: boolean;
  sidebarWidth: number;
  floatingToolbarAnchor: 'top' | 'bottom' | 'left' | 'right';
  toolbarDisplayMode: 'icon_text' | 'icon_only' | 'text_only';
  toolbarSections: {
    files: boolean;
    system: boolean;
    editing: boolean;
  };
  toolbarItems: {
    fileNew: boolean;
    fileOpen: boolean;
    fileOpenFolder: boolean;
    fileSave: boolean;
    fileExport: boolean;
    sysFind: boolean;
    sysSnippets: boolean;
    sysTheme: boolean;
    sysSidebar: boolean;
    sysEdit: boolean;
    sysSplit: boolean;
    sysPreview: boolean;
    sysZen: boolean;
    sysSettings: boolean;
    editBold: boolean;
    editItalic: boolean;
    editCode: boolean;
    editLink: boolean;
    editImage: boolean;
    editUL: boolean;
    editOL: boolean;
    editTask: boolean;
  };
  accordionState: Record<string, boolean>;
  findReplace: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  };
  theme: Theme; // Current color theme
  viewMode: ViewMode; // Last used view mode (edit/split/preview)
}

export interface DocumentTab {
  id: string;
  name: string;
  path: string | null;
  content: string;
  dirty: boolean;
}

export interface WorkspaceNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: WorkspaceNode[];
}

export interface TextPreset {
  id: string;
  name: string;
  description: string;
  fontFamily: string; // 'sans', 'serif', 'mono'
  proseClass: string; // Base prose class (e.g. prose-lg)
  lineHeight: number; // Base line height override
  components: {
    h1: string;
    h2: string;
    p: string;
    img: string;
    blockquote: string;
    code: string;
    link: string;
  };
}

export interface Snippet {
  id: string;
  name: string;
  category: string;
  trigger: string;
  icon?: string;
  content: string;
}

export interface PublicationPreset {
  id: string;
  name: string;
  description: string;
  palette: {
    bg: string;
    text: string;
    accent: string;
    muted: string;
  };
  typography: {
    fontFamily: string;
    lineHeight: number;
  };
}
