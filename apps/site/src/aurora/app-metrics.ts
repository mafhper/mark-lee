import { RECORD_THEMES, RecordTheme } from "@/aurora/theme-tokens";

/**
 * Medidas da janela do aplicativo, agora tiradas do DOM do aplicativo rodando.
 *
 * A versao anterior deste arquivo era uma leitura de pixel das capturas
 * (`.dev/tmp/demo-shots/editor-sidebar.png`). Ela acertava as alturas e errava o
 * resto: a barra de titulo tem 32px de conteudo **mais** 1px de borda (33), o
 * passo do codigo e 25,6px (nao 26), a indentacao da arvore e 14px (nao 16) e o
 * texto mono avanca 8,8px por caractere — nao 9,9.
 *
 * Cada numero abaixo vem de `getBoundingClientRect()` +
 * `getComputedStyle()` do aplicativo em 1440x900 (`Vite dev` + shim de IPC),
 * medido numa aba so, vista `edit`, tema Golden. O JSON completo, elemento por
 * elemento, esta em `.dev/tmp/stage-medidas/medidas.json`. A prova de que a
 * recriacao usa estes numeros e o pixel-diff em `.dev/tmp/stage-recriacao/`.
 *
 * Coordenada de referencia (1440x900, bordas inclusive):
 *
 *   barra de titulo ... 0..32 + 1px de borda  -> 33
 *   faixa de abas ..... 33..72 + 1px de borda -> 40
 *   corpo ............. 73..868               -> 795
 *   barra de status ... 868..900              -> 32
 *   sidebar ........... 0..259 + 1px          -> 260
 *   gutter ............ 43,98 (25,59 + 18,39)
 */
export const APP_METRICS = {
  /** Raio da janela inteira (`rounded-[8px]` no contêiner do app). */
  windowRadius: 8,

  chrome: {
    /** `h-8` do conteudo da linha do topo. */
    height: 32,
    borderBottom: 1,
    paddingX: 8,
    fontSize: 12,
    lineHeight: 18,
    brand: {
      tile: 24,
      tileRadius: 4,
      gap: 8,
      nameSize: 13,
      nameWeight: 600,
      nameLineHeight: 19.5,
    },
    menu: {
      height: 26,
      paddingY: 4,
      paddingX: 10,
      radius: 4,
      fontSize: 12,
      lineHeight: 18,
    },
    toolbar: {
      /** Largura calculada pelo app (`sectionBoxWidths`), nao pelo conteudo. */
      width: 278,
      height: 32,
      paddingX: 6,
      gap: 8,
      itemGap: 4,
      button: 32,
      buttonRadius: 8,
      /** `.ml-duotone-icon` = 1.1rem. */
      iconBox: 17.6,
      iconSize: 13,
      iconStroke: 1.9,
      iconBackStroke: 1.4,
      iconBackShift: 0.55,
    },
    switcher: {
      height: 22.5,
      radius: 4,
      border: 1,
      itemHeight: 20.5,
      fontSize: 11,
      fontWeight: 600,
      paddingY: 2,
      paddingX: 10,
      lineHeight: 16.5,
    },
    windowControls: {
      width: 144,
      button: 48,
      height: 32,
      iconSize: 14,
      maximizeIconSize: 11,
    },
  },

  tabs: {
    height: 40,
    borderBottom: 1,
    paddingX: 6,
    button: 36,
    buttonRadius: 8,
    iconSize: 15,
    gap: 4,
    tabHeight: 36,
    tabRadius: 6,
    tabPaddingX: 12,
    tabGap: 8,
    fontSize: 12,
    lineHeight: 16,
    closeBox: 20,
    closeIcon: 12,
    closeOpacity: 0.7,
    activeAlpha: 0.14,
  },

  sidebar: {
    width: 260,
    borderRight: 1,
    header: {
      height: 40,
      paddingX: 8,
      button: 32,
      buttonRadius: 8,
      gap: 4,
      iconSize: 14,
    },
    search: {
      blockPadding: 8,
      blockGap: 8,
      height: 28,
      radius: 6,
      paddingY: 6,
      paddingX: 8,
      gap: 8,
      iconSize: 13,
      fontSize: 12,
      lineHeight: 16,
      /** `bg-black/5`, igual nos dois temas medidos. */
      backgroundAlpha: 0.05,
    },
    label: {
      blockPaddingY: 4,
      paddingX: 4,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.14em",
      opacity: 0.55,
      /* 16,5 e o que fecha a altura do bloco em 72,5: com 17, a arvore inteira
       * desce 0,5px e todo texto da lateral sai com meio pixel de desvio. */
      lineHeight: 16.5,
    },
    tree: {
      padding: 8,
      listPadding: 4,
      listRadius: 6,
      rowHeight: 24,
      rowRadius: 4,
      rowPaddingX: 8,
      indent: 14,
      gap: 8,
      fontSize: 12,
      lineHeight: 16,
      chevronSize: 14,
      activeAlpha: 0.14,
    },
  },

  editor: {
    /** 25,59 do numero + 18,39 da dobra. */
    gutterWidth: 43.98,
    /** Borda direita do numero: `gutterWidth - 21,39`. */
    numberRightInset: 21.39,
    contentPaddingY: 4,
    /** `.cm-content` usa `line-height: 1.6` sobre 16px. */
    fontSize: 16,
    lineHeight: 25.6,
    /** O numero da linha herda o `line-height` do `.cm-scroller` (1.4), nao o da
     *  linha: por isso ele fica no topo da faixa de 25,6px. */
    gutterLineHeight: 22.4,
    /** O `.cm-content` nao ocupa a largura toda: o scroller reserva ~10px para a
     *  barra de rolagem (`scrollbar-gutter`), e a linha ativa termina ali. */
    contentRightReserve: 10,
    /** `.cm-line` = `padding: 0 2px 0 6px` (tema base do CodeMirror). */
    linePaddingRight: 2,
    linePaddingLeft: 6,
    /** `.cm-lineNumbers .cm-gutterElement` = `padding: 0 3px 0 5px`. */
    numberPaddingLeft: 5,
    numberPaddingRight: 3,
    activeLineAlpha: 0.09,
    activeLineAlphaGolden: 0.12,
    activeGutterAlpha: 0.1,
    activeGutterAlphaGolden: 0.12,
    activeGutterRadius: 4,
    numberAlpha: 0.68,
  },

  status: {
    height: 32,
    borderTop: 1,
    paddingX: 12,
    fontSize: 12,
    lineHeight: 16,
    gap: 12,
    gapRight: 16,
    chip: {
      height: 22,
      radius: 9999,
      paddingY: 2,
      paddingX: 8,
      gap: 6,
      dot: 6,
    },
    clock: {
      height: 15,
      radius: 9999,
      paddingY: 2,
      paddingX: 8,
      gap: 4,
      iconSize: 11,
      opacity: 0.7,
    },
    /** Cor do selo de salvo: `text-emerald-600`, igual em todos os temas. */
    savedColor: "#059669",
    /** A borda de 1px nao segue o tema: o `border-current/10` do app nao gera
     *  regra e o seletor universal do app responde `--border`. Medido. */
    chipBorder: "#e5e7eb",
  },

  memories: {
    navWidth: 240,
    listWidth: 380,
    navHeaderHeight: 44,
    navHeaderPaddingX: 12,
    navHeaderPaddingY: 8,
  },
} as const;

/**
 * As duas familias que o aplicativo usa, com o mesmo `font-family` computado.
 *
 * A da interface e a Cal Sans Text UI empacotada no repositorio
 * (`public/fonts/`), carregada pelo site a partir de `src/assets/fonts`.
 *
 * A do editor e `monospace` — e isso nao e simplificacao: o aplicativo declara
 * `'JetBrains Mono', 'Fira Code', monospace` e nenhuma das duas primeiras existe
 * na maquina medida, entao o navegador resolve para a familia generica e o
 * avanco medido e 8,8px por caractere em 16px. Trocar por uma fonte hospedada
 * aqui mudaria a quebra de linha do documento.
 */
export const UI_FONT = '"Cal Sans Text UI", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';
export const MONO_FONT = "monospace";

/** O tema do palco: Midnight, o mesmo que abre o seletor da secao de temas. */
export const STAGE_APP_THEME: RecordTheme =
  RECORD_THEMES.find((theme) => theme.id === "midnight") ?? RECORD_THEMES[0];
