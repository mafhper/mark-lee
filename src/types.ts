export type ViewMode = 'split' | 'edit' | 'preview';

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Midnight = 'midnight',
  Sepia = 'sepia'
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
}