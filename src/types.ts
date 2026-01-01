export type ViewMode = 'split' | 'edit' | 'preview';

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Midnight = 'midnight',
  Sepia = 'sepia',
  Terminal = 'terminal',
  Nord = 'nord',
  Synthwave = 'synthwave',
  Forest = 'forest',
  Coffee = 'coffee'
}

export type Language = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'it-IT' | 'zh-CN' | 'ja-JP';

export interface ThemeConfig {
  bg: string; // Tailwind class for solid, used for reference
  bgHex: string; // Hex value for opacity manipulation
  fg: string;
  ui: string;
  uiBorder: string;
  editorBg: string; // Tailwind class
  editorBgHex: string; // Hex for opacity
  editorFg: string;
  accent: string;
  prose: string; // Tailwind prose class suffix
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
  fontFamily: 'mono' | 'sans' | 'serif';
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
  toolbarPosition: 'top' | 'bottom' | 'left' | 'right';
  theme: Theme; // Current color theme
  viewMode: ViewMode; // Last used view mode (edit/split/preview)
  toolbarItems?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    headers?: boolean;
    quote?: boolean;
    link?: boolean;
    image?: boolean;
    lists?: boolean;
    viewModes?: boolean;
    themes?: boolean;
    zenMode?: boolean;
    positionSelector?: boolean;
  };
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