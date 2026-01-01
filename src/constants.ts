/**
 * config.ts
 * 
 * Configurações centralizadas do Mark-Lee Editor
 * Define temas, configurações padrão e snippets de Markdown
 * 
 * @version 1.0
 * @author Mark-Lee Team
 */

import { Theme, ThemeConfig, AppSettings } from './types';

// Helper to convert hex to RGBA is handled in App logic or by providing Hex codes here
// We provide hex codes for background to allow opacity manipulation
export const THEMES: Record<Theme, ThemeConfig> = {
  [Theme.Light]: {
    bg: 'bg-white',
    bgHex: '#ffffff',
    fg: 'text-slate-800',
    ui: 'bg-gray-50',
    uiBorder: 'border-gray-200',
    editorBg: 'bg-white',
    editorBgHex: '#ffffff',
    editorFg: 'text-slate-800',
    accent: 'text-indigo-600',
    prose: 'prose-slate',
  },
  [Theme.Dark]: {
    bg: 'bg-[#18181b]',
    bgHex: '#18181b',
    fg: 'text-zinc-300',
    ui: 'bg-[#18181b]',
    uiBorder: 'border-zinc-800',
    editorBg: 'bg-[#18181b]',
    editorBgHex: '#18181b',
    editorFg: 'text-zinc-300',
    accent: 'text-blue-400',
    prose: 'prose-invert',
  },
  [Theme.Midnight]: {
    bg: 'bg-[#0f172a]',
    bgHex: '#0f172a',
    fg: 'text-slate-200',
    ui: 'bg-[#020617]',
    uiBorder: 'border-[#1e293b]',
    editorBg: 'bg-[#0f172a]',
    editorBgHex: '#0f172a',
    editorFg: 'text-slate-200',
    accent: 'text-indigo-400',
    prose: 'prose-invert prose-indigo',
  },
  [Theme.Sepia]: {
    bg: 'bg-[#fbf1c7]',
    bgHex: '#fbf1c7',
    fg: 'text-[#3c3836]',
    ui: 'bg-[#ebdbb2]',
    uiBorder: 'border-[#d5c4a1]',
    editorBg: 'bg-[#fbf1c7]',
    editorBgHex: '#fbf1c7',
    editorFg: 'text-[#3c3836]',
    accent: 'text-[#8f5e10]',
    prose: 'prose-stone',
  },
  [Theme.Terminal]: {
    bg: 'bg-[#000000]',
    bgHex: '#000000',
    fg: 'text-[#00ff41]',
    ui: 'bg-[#0d0d0d]',
    uiBorder: 'border-[#1a1a1a]',
    editorBg: 'bg-[#000000]',
    editorBgHex: '#000000',
    editorFg: 'text-[#00ff41]',
    accent: 'text-[#00ff41]',
    prose: 'prose-invert prose-green',
  },
  [Theme.Nord]: {
    bg: 'bg-[#2E3440]',
    bgHex: '#2E3440',
    fg: 'text-[#ECEFF4]',
    ui: 'bg-[#3B4252]',
    uiBorder: 'border-[#434C5E]',
    editorBg: 'bg-[#2E3440]',
    editorBgHex: '#2E3440',
    editorFg: 'text-[#ECEFF4]',
    accent: 'text-[#88C0D0]',
    prose: 'prose-invert prose-blue',
  },
  [Theme.Synthwave]: {
    bg: 'bg-[#2b213a]',
    bgHex: '#2b213a',
    fg: 'text-[#fff]',
    ui: 'bg-[#1a1a2e]',
    uiBorder: 'border-[#ff00ff]',
    editorBg: 'bg-[#2b213a]',
    editorBgHex: '#2b213a',
    editorFg: 'text-[#fff]',
    accent: 'text-[#f92aad]',
    prose: 'prose-invert prose-pink',
  },
  [Theme.Forest]: {
    bg: 'bg-[#1b261b]',
    bgHex: '#1b261b',
    fg: 'text-[#e8f5e9]',
    ui: 'bg-[#2d3b2d]',
    uiBorder: 'border-[#4caf50]',
    editorBg: 'bg-[#1b261b]',
    editorBgHex: '#1b261b',
    editorFg: 'text-[#e8f5e9]',
    accent: 'text-[#66bb6a]',
    prose: 'prose-invert prose-green',
  },
  [Theme.Coffee]: {
    bg: 'bg-[#2d241e]',
    bgHex: '#2d241e',
    fg: 'text-[#ede0d4]',
    ui: 'bg-[#3e3229]',
    uiBorder: 'border-[#5d4037]',
    editorBg: 'bg-[#2d241e]',
    editorBgHex: '#2d241e',
    editorFg: 'text-[#ede0d4]',
    accent: 'text-[#d7ccc8]',
    prose: 'prose-invert prose-stone', // Added prose-invert
  }
};

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  'file-new': 'Ctrl+N',
  'file-open': 'Ctrl+O',
  'file-save': 'Ctrl+S',
  'file-save-as': 'Ctrl+Shift+S',
  'file-export-pdf': 'Ctrl+E',
  'file-print': 'Ctrl+P',
  'edit-undo': 'Ctrl+Z',
  'edit-redo': 'Ctrl+Y',
  'edit-find': 'Ctrl+F',
  'edit-replace': 'Ctrl+H',
  'view-zen': 'F10',
  'view-toolbar': 'Ctrl+T',
};

// Text Styling Presets
import { TextPreset } from './types';

export const TEXT_PRESETS: Record<string, TextPreset> = {
  'minimalist': {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, sans-serif, modern. Standard web look.',
    fontFamily: 'sans',
    proseClass: 'prose-slate',
    lineHeight: 1.6,
    components: {
      h1: 'font-sans font-bold tracking-tight',
      h2: 'font-sans font-semibold tracking-tight',
      p: 'font-sans leading-relaxed',
      img: 'rounded-xl shadow-sm',
      blockquote: 'border-l-2 border-slate-300 pl-4 italic',
      code: 'rounded-md',
      link: 'underline decoration-1 underline-offset-2'
    }
  },
  'editorial': {
    id: 'editorial',
    name: 'Editorial',
    description: 'Serif fonts, elegant, book-like reading experience.',
    fontFamily: 'serif',
    proseClass: 'prose-stone',
    lineHeight: 1.8,
    components: {
      h1: 'font-serif font-bold italic tracking-wide',
      h2: 'font-serif font-medium',
      p: 'font-serif text-lg leading-loose',
      img: 'rounded-sm shadow-md',
      blockquote: 'border-l-4 border-stone-400 pl-6 italic font-serif text-xl',
      code: 'rounded',
      link: 'decoration-2 underline-offset-4'
    }
  },
  'technical': {
    id: 'technical',
    name: 'Technical',
    description: 'Monospace headers, high contrast, documentation style.',
    fontFamily: 'mono',
    proseClass: 'prose-neutral',
    lineHeight: 1.5,
    components: {
      h1: 'font-mono font-bold uppercase tracking-tighter',
      h2: 'font-mono font-bold border-b pb-2',
      p: 'font-sans text-base',
      img: 'rounded-none border-2 border-gray-200',
      blockquote: 'bg-gray-100 dark:bg-gray-800 p-4 border-l-4 border-gray-500 not-italic font-mono text-sm',
      code: 'rounded-sm border border-gray-200 dark:border-gray-700',
      link: 'text-blue-600 dark:text-blue-400 hover:underline'
    }
  },
  'creative': {
    id: 'creative',
    name: 'Creative',
    description: 'Expressive, playful, unique markers.',
    fontFamily: 'sans',
    proseClass: 'prose-pink',
    lineHeight: 1.7,
    components: {
      h1: 'font-black uppercase tracking-widest decoration-wavy decoration-pink-500 underline',
      h2: 'font-bold tracking-wide text-pink-600 dark:text-pink-400',
      p: 'font-medium',
      img: 'rounded-[2rem] shadow-xl rotate-1 hover:rotate-0 transition-transform',
      blockquote: 'border-l-8 border-pink-400 pl-6 font-bold text-lg bg-pink-50 dark:bg-pink-900/20 py-2 rounded-r-xl',
      code: 'rounded-xl shadow-inner',
      link: 'font-bold hover:text-pink-500 transition-colors'
    }
  }
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt-BR',
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'mono',
  wordWrap: true,
  typewriterMode: false,
  spellCheck: true,
  transparency: 1.0,
  singleInstance: false, // false = multiple windows (default), true = single window
  autoSave: false, // disabled by default
  autoSaveInterval: 60, // 60 seconds default
  focusMode: false, // disabled by default
  customShortcuts: DEFAULT_SHORTCUTS,
  presetId: 'minimalist',
  toolbarPosition: 'bottom',
  theme: Theme.Sepia,
  viewMode: 'edit',
};

export const INITIAL_MARKDOWN = `# Mark-Lee v1.0

Um editor Markdown robusto e focado, projetado para **Windows**.

## Recursos da Interface
O Mark-Lee fornece um ambiente puro e livre de distrações:
1. **Modo Zen**: A interface desaparece quando você para de mover o mouse.
2. **Rolagem Sincronizada**: O editor e a visualização se movem juntos.
3. **Exportação PDF**: Transforme seus textos em documentos formatados.
4. **Temas**: Claro, Escuro, Meia-noite e Sépia.

## Exemplos de Formatação

### Tipografia
Você pode escrever em **negrito**, *itálico*, ou \`código inline\`.

> "A simplicidade é o último grau de sofisticação."
> — Leonardo da Vinci

### Blocos de Código
Perfeito para desenvolvedores.

\`\`\`javascript
function saudacao(nome) {
  return \`Olá, \${nome}!\`;
}
console.log(saudacao("Usuário Mark-Lee"));
\`\`\`

### Listas de Tarefas
- [x] Instalar Mark-Lee
- [x] Desfrutar da escrita sem distrações
- [x] Exportar para PDF
`;

// Markdown Snippets for quick insertion
export interface Snippet {
  id: string;
  name: string;
  icon: string;
  content: string;
}

export const SNIPPETS: Snippet[] = [
  { id: 'table', name: 'Table', icon: '📊', content: "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |" },
  { id: 'code', name: 'Code Block', icon: '💻', content: "```\n// Your code here\n```" },
  { id: 'task', name: 'Task List', icon: '✅', content: "- [ ] Task 1\n- [ ] Task 2\n- [x] Done" },
  { id: 'callout', name: 'Callout', icon: '💡', content: "> **Note:** Important information here." },
  { id: 'image', name: 'Image', icon: '🖼️', content: "![Alt text](https://example.com/image.png)" },
  { id: 'link', name: 'Link', icon: '🔗', content: "[Link text](https://example.com)" }
];