/**
 * Os doze temas do aplicativo, com os valores que ele de fato usa.
 *
 * Espelho de `THEMES` em `src/constants.ts`: os hexadecimais sao copiados, nao
 * aproximados, porque o site precisa mostrar a mesma cor que o editor mostra.
 * O teste `theme-tokens.test.ts` le o arquivo do aplicativo e falha se as duas
 * listas divergirem — uma paleta que envelhece em silencio e pior do que uma
 * paleta ausente.
 */
export interface RecordTheme {
  id: string;
  name: string;
  bgHex: string;
  fgHex: string;
  uiHex: string;
  uiBorderHex: string;
  editorBgHex: string;
  editorFgHex: string;
  accentHex: string;
}

export const RECORD_THEMES: RecordTheme[] = [
  {
    id: "coffee",
    name: "Coffee",
    bgHex: "#2b231f",
    fgHex: "#f8f1e8",
    uiHex: "#3a2f29",
    uiBorderHex: "#6a5448",
    editorBgHex: "#2b231f",
    editorFgHex: "#f8f1e8",
    accentHex: "#f4c68f",
  },
  {
    id: "light",
    name: "Light",
    bgHex: "#ffffff",
    fgHex: "#0f172a",
    uiHex: "#f9fafb",
    uiBorderHex: "#e5e7eb",
    editorBgHex: "#ffffff",
    editorFgHex: "#0f172a",
    accentHex: "#4f46e5",
  },
  {
    id: "dark",
    name: "Dark",
    bgHex: "#16191e",
    fgHex: "#f4f4f5",
    uiHex: "#1d2229",
    uiBorderHex: "#2c3440",
    editorBgHex: "#16191e",
    editorFgHex: "#f4f4f5",
    accentHex: "#7dd3fc",
  },
  {
    id: "forest",
    name: "Forest",
    bgHex: "#17241b",
    fgHex: "#e8fbe9",
    uiHex: "#203124",
    uiBorderHex: "#3c6b48",
    editorBgHex: "#17241b",
    editorFgHex: "#e8fbe9",
    accentHex: "#90f0a8",
  },
  {
    id: "golden",
    name: "Golden",
    bgHex: "#f4d49a",
    fgHex: "#1e1308",
    uiHex: "#e7be73",
    uiBorderHex: "#6b4b16",
    editorBgHex: "#f4d49a",
    editorFgHex: "#1e1308",
    accentHex: "#2a1808",
  },
  {
    id: "midnight",
    name: "Midnight",
    bgHex: "#111827",
    fgHex: "#eef2ff",
    uiHex: "#0b1220",
    uiBorderHex: "#24344e",
    editorBgHex: "#111827",
    editorFgHex: "#eef2ff",
    accentHex: "#8fb5ff",
  },
  {
    id: "neomatrix",
    name: "Neomatrix",
    bgHex: "#040b04",
    fgHex: "#8afcc7",
    uiHex: "#061207",
    uiBorderHex: "#1b5a33",
    editorBgHex: "#040b04",
    editorFgHex: "#8afcc7",
    accentHex: "#57ff9e",
  },
  {
    id: "nord",
    name: "Nord",
    bgHex: "#2E3440",
    fgHex: "#ECEFF4",
    uiHex: "#262f40",
    uiBorderHex: "#425066",
    editorBgHex: "#2E3440",
    editorFgHex: "#ECEFF4",
    accentHex: "#88C0D0",
  },
  {
    id: "sepia",
    name: "Sepia",
    bgHex: "#f2e6c5",
    fgHex: "#2d2417",
    uiHex: "#e8d7ad",
    uiBorderHex: "#b99f63",
    editorBgHex: "#f2e6c5",
    editorFgHex: "#2d2417",
    accentHex: "#8d5f12",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    bgHex: "#221833",
    fgHex: "#fef3ff",
    uiHex: "#2e1f45",
    uiBorderHex: "#8a39d3",
    editorBgHex: "#221833",
    editorFgHex: "#fef3ff",
    accentHex: "#ff89cf",
  },
  {
    id: "terminal",
    name: "Terminal",
    bgHex: "#000000",
    fgHex: "#87ffa5",
    uiHex: "#050505",
    uiBorderHex: "#1c4728",
    editorBgHex: "#000000",
    editorFgHex: "#87ffa5",
    accentHex: "#5bffa0",
  },
  {
    id: "firenight",
    name: "Firenight",
    bgHex: "#1b0f0d",
    fgHex: "#ffe1bf",
    uiHex: "#2a1713",
    uiBorderHex: "#8a4c31",
    editorBgHex: "#1b0f0d",
    editorFgHex: "#ffe1bf",
    accentHex: "#ffb86c",
  },
];

/**
 * Ordem dos seletores na secao de temas: os quatro do desenho original
 * (Midnight, Sepia, Forest, Nord) e depois os oito restantes, fechando tres
 * linhas de quatro. Fica aqui, e nao no componente, para o teste poder conferir
 * que os doze temas estao cobertos e nao sobrar nenhum de fora em silencio.
 */
export const THEME_ORDER = [
  "midnight",
  "sepia",
  "forest",
  "nord",
  "coffee",
  "light",
  "dark",
  "golden",
  "neomatrix",
  "synthwave",
  "terminal",
  "firenight",
];

export const ORDERED_THEMES: RecordTheme[] = THEME_ORDER.map((id) =>
  RECORD_THEMES.find((theme) => theme.id === id),
).filter((theme): theme is RecordTheme => Boolean(theme));

/**
 * Texto secundario derivado de dois tokens reais do tema.
 *
 * O aplicativo tem tokens de "muted" que o site nao precisa copiar; misturar
 * `fg` com o fundo do proprio painel da o mesmo degrau de leitura sem inventar
 * uma cor que o aplicativo nao tem.
 */
export function fadeToken(fgHex: string, bgHex: string, weight = 70): string {
  return `color-mix(in oklab, ${fgHex} ${weight}%, ${bgHex})`;
}

/**
 * Um token do tema com alfa, que e como o aplicativo escreve os fundos de
 * hover, de linha ativa e de aba ativa (`color-mix(in srgb, fg 14%, transparent)`).
 */
export function alphaToken(colorHex: string, value: number): string {
  return `color-mix(in srgb, ${colorHex} ${value * 100}%, transparent)`;
}
