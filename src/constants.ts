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
    fg: 'text-slate-300',
    ui: 'bg-[#020617]',
    uiBorder: 'border-[#1e293b]',
    editorBg: 'bg-[#0f172a]',
    editorBgHex: '#0f172a',
    editorFg: 'text-indigo-100',
    accent: 'text-purple-400',
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
    accent: 'text-[#b57614]',
    prose: 'prose-stone',
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