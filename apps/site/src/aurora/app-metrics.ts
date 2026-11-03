import { RECORD_THEMES, RecordTheme } from "@/aurora/theme-tokens";

/**
 * Medidas da janela do aplicativo, tiradas das capturas reais.
 *
 * Fonte: `.dev/tmp/demo-shots/editor-sidebar.png` e
 * `.dev/tmp/site-shots/shots/memorias-entry-1440.png` (1440x900), medidas por
 * varredura de pixel (scripts privados do workspace). Cada numero aqui tem uma
 * coordenada que o comprova — nao e estimativa de olho:
 *
 *   barra do topo ....... borda horizontal em y=32  -> 32px
 *   strip de abas ....... borda horizontal em y=72  -> 40px (33..72)
 *   barra de status ..... borda horizontal em y=868 -> 32px (869..900)
 *   sidebar do Editor ... borda vertical  em x=259  -> 260px
 *   nav de Memorias ..... borda vertical  em x=239  -> 240px
 *   lista de Memorias ... borda vertical  em x=619  -> 380px
 *   passo do codigo ..... 25,5px entre faixas de texto -> 26px (16px de fonte:
 *                         890px / 90 caracteres = 9,9px por caractere)
 *   passo da arvore ..... 24px (y 165, 189, 213, ...)
 *   indentacao .......... 16px por nivel (x 23 -> 39 -> 53)
 *   chip da aba ......... 30px de altura, encostado na base da strip
 *
 * A janela do site e mais estreita que a captura (o `measure` do site tem
 * 1088px). As alturas e a largura da sidebar sao as mesmas do aplicativo: e o
 * app numa janela menor, nao uma miniatura desenhada por aproximacao.
 */
export const APP_METRICS = {
  barHeight: 32,
  tabStripHeight: 40,
  tabHeight: 30,
  statusBarHeight: 32,
  editorSidebarWidth: 260,
  memoriesNavWidth: 240,
  memoriesListWidth: 380,
  codeFontSize: 16,
  codeLineHeight: 26,
  treeRowHeight: 24,
  treeIndent: 16,
  brandTileSize: 24,
  controlSize: 24,
} as const;

/**
 * O tema da janela do palco. Midnight e o padrao do seletor de temas e o unico
 * dos doze que conversa com o palco escuro do site — e as sete cores vem de
 * `THEMES`, nao de uma paleta paralela.
 */
export const STAGE_APP_THEME: RecordTheme =
  RECORD_THEMES.find((theme) => theme.id === "midnight") ?? RECORD_THEMES[0];
