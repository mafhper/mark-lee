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
  bg: string;
  bgHex: string;
  fg: string;
  fgHex: string;
  ui: string;
  uiHex: string;
  uiBorder: string;
  uiBorderHex: string;
  editorBg: string;
  editorBgHex: string;
  editorFg: string;
  editorFgHex: string;
  accent: string;
  accentHex: string;
  prose: string; // Tailwind prose class suffix
  uiFont: string;
  editorFont: string;
}

export type ThemeId = string;

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  config: ThemeConfig;
  builtIn?: boolean;
  baseThemeId?: Theme;
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
  showToolbarSectionLabels: boolean;
  toolbarAlwaysShowIcons: boolean;
  toolbarCompactBreakpoint: number;
  toolbarDisplayMode: 'icon_text' | 'icon_only' | 'text_only';
  toolbarSectionBehavior: "default" | "repulsion";
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
  toolbarByAnchor?: Partial<
    Record<
      "top" | "bottom" | "left" | "right",
      {
        showToolbarSectionLabels: boolean;
        toolbarCompactBreakpoint: number;
        toolbarDisplayMode: "icon_text" | "icon_only" | "text_only";
        toolbarSectionBehavior: "default" | "repulsion";
        toolbarSections: AppSettings["toolbarSections"];
        toolbarItems: AppSettings["toolbarItems"];
      }
    >
  >;
  accordionState: Record<string, boolean>;
  findReplace: {
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  };
  commandPalette: {
    includeActions: boolean;
    includeOpenTabs: boolean;
    includeRecentFiles: boolean;
    includeSnippets: boolean;
    searchMode: "standard" | "deep";
    snippetBehavior: "insert" | "manage";
    closeAfterSelect: boolean;
    showHints: boolean;
    maxResults: number;
  };
  themeLibrary: ThemeDefinition[];
  theme: ThemeId;
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

export type PublicationTone = "text" | "accent" | "muted";
export type PublicationTracking = "tight" | "normal" | "wide";
export type PublicationShadow = "none" | "soft" | "lifted" | "editorial";
export type PublicationUnderline = "none" | "subtle" | "strong";

export interface PublicationSurfaceStyle {
  bg: string;
  text: string;
  accent: string;
  muted: string;
  border: string;
  radius: number;
  shadow: PublicationShadow;
}

export interface PublicationTypographyStyle {
  fontFamily: string;
  lineHeight: number;
  bodySize: number;
  bodyWeight: number;
  headingWeight: number;
  tracking: PublicationTracking;
}

export interface PublicationSpacingStyle {
  pagePadding: number;
  columnWidth: number;
  blockGap: number;
  paragraphGap: number;
  listGap: number;
  tableCellPaddingX: number;
  tableCellPaddingY: number;
}

export interface PublicationHeadingStyle {
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
  marginTop: number;
  marginBottom: number;
  tone: PublicationTone;
  italic?: boolean;
  uppercase?: boolean;
}

export interface PublicationParagraphStyle {
  size: number;
  weight: number;
  lineHeight: number;
  marginBottom: number;
  tone: "text" | "muted";
}

export interface PublicationListStyle {
  size: number;
  weight: number;
  lineHeight: number;
  itemGap: number;
  indent: number;
  markerTone: PublicationTone;
}

export interface PublicationBlockquoteStyle {
  paddingX: number;
  paddingY: number;
  radius: number;
  borderWidth: number;
  tone: "accent" | "muted";
  useBackground: boolean;
  italic: boolean;
}

export interface PublicationInlineCodeStyle {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  radius: number;
  useBackground: boolean;
  useBorder: boolean;
}

export interface PublicationCodeBlockStyle {
  fontSize: number;
  padding: number;
  radius: number;
  useBackground: boolean;
  useBorder: boolean;
}

export interface PublicationLinkStyle {
  weight: number;
  underline: PublicationUnderline;
}

export interface PublicationRuleStyle {
  thickness: number;
  opacity: number;
  margin: number;
}

export interface PublicationTableStyle {
  headerWeight: number;
  cellPaddingX: number;
  cellPaddingY: number;
  radius: number;
  striped: boolean;
  dense: boolean;
  useBorder: boolean;
  captionTone: "accent" | "muted";
}

export interface PublicationImageStyle {
  radius: number;
  margin: number;
  useBorder: boolean;
  shadow: PublicationShadow;
}

export interface PublicationFrontmatterStyle {
  padding: number;
  radius: number;
  useBorder: boolean;
  useBackground: boolean;
  titleWeight: number;
}

export interface PublicationElementStyles {
  h1: PublicationHeadingStyle;
  h2: PublicationHeadingStyle;
  h3: PublicationHeadingStyle;
  p: PublicationParagraphStyle;
  list: PublicationListStyle;
  blockquote: PublicationBlockquoteStyle;
  codeInline: PublicationInlineCodeStyle;
  codeBlock: PublicationCodeBlockStyle;
  link: PublicationLinkStyle;
  hr: PublicationRuleStyle;
  table: PublicationTableStyle;
  image: PublicationImageStyle;
  frontmatterCard: PublicationFrontmatterStyle;
}

export interface PublicationPreset {
  id: string;
  name: string;
  description: string;
  surface: PublicationSurfaceStyle;
  typography: PublicationTypographyStyle;
  spacing: PublicationSpacingStyle;
  elements: PublicationElementStyles;
}
