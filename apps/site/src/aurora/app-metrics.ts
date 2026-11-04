import { RECORD_THEMES, RecordTheme } from "@/aurora/theme-tokens";

/**
 * Medidas da janela do aplicativo, agora tiradas do DOM do aplicativo rodando.
 *
 * A versao anterior deste arquivo era uma leitura de pixel de uma captura de
 * tela do editor. Ela acertava as alturas e errava o resto: a barra de titulo
 * tem 32px de conteudo **mais** 1px de borda (33), o passo do codigo e 25,6px
 * (nao 26), a indentacao da arvore e 14px (nao 16) e o texto mono avanca 8,8px
 * por caractere — nao 9,9.
 *
 * Cada numero abaixo vem de `getBoundingClientRect()` +
 * `getComputedStyle()` do aplicativo em 1440x900 (`Vite dev` + shim de IPC),
 * medido numa aba so, vista `edit`, tema Golden, elemento por elemento. A prova
 * de que a recriacao usa estes numeros e o pixel-diff contra a tela real: o
 * numero que nao bate aparece como diferenca de imagem, nao como opiniao.
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
  /** Raio da janela inteira. O aplicativo declara 8px no contêiner
   *  (`rounded-[8px]`); aqui a quina e 6px por decisao de palco — a janela
   *  encosta direto no fundo escuro, sem moldura, e 6px suaviza a quina sem
   *  virar pílula. Dois pixels de raio nao se veem, mas o registro fica. */
  windowRadius: 6,

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
      /* O `<Search size={14}>` do app e encolhido pelo flex para 12,72 (o input
       * ao lado tem `w-full`); a recriacao reproduz o mecanismo, nao o resultado:
       * o icone sai com 14 de base e o flex o aperta igual. */
      iconSize: 14,
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
    /** 25,5938 do numero + 18,3906 da dobra. A soma e 43,9844, e nao 43,98: o
     *  arredondamento de 2 casas deslocava o texto em 0,03px, o bastante para
     *  trocar o antialias de cada glifo e virar diferenca no pixel-diff. */
    gutterWidth: 43.9844,
    /** `.cm-lineNumbers .cm-gutterElement` = `min-width: 2em` + `padding: 0 0.35rem`. */
    numberWidth: 25.5938,
    /** Borda direita do numero: `gutterWidth - 21,39`. */
    numberRightInset: 21.39,
    contentPaddingY: 4,
    /** `.cm-content` usa `line-height: 1.6` sobre 16px. */
    fontSize: 16,
    lineHeight: 25.6,
    /** O numero da linha herda o `line-height` do `.cm-scroller` (1.4), nao o da
     *  linha: por isso ele fica no topo da faixa de 25,6px. */
    gutterLineHeight: 22.4,
    /** A coluna de dobra ao lado dos numeros: `.cm-foldGutter .cm-gutterElement`
     *  = `min-width: 1.15em` (18,4 em 16px) com `padding: 0 0.2rem`. Ela existe
     *  mesmo sem dobra na linha, e e ela que empurra o texto para x=303,98. */
    foldWidth: 18.3906,
    foldPaddingX: 3.2,

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

  /**
   * A lateral de Memorias, medida no app rodando (1440x900, tema Midnight,
   * caderno demo, registro aberto em `split`).
   *
   * Nao e a arvore do editor e nao e uma lista de secoes soltas: sao **quatro
   * acordeoes** (Cadernos, Registros, Tags, Tarefas) na area rolavel e um
   * quinto (Pins) preso no rodape, com um cartao de capa dentro do primeiro.
   * Coordenada de referencia:
   *
   *   cabecalho .............. 33..77          -> 44
   *   bloco de acoes ......... 77..164,5       -> 87,5
   *   area rolavel ........... 164,5..665      -> 500,5 (conteudo 604, cortado)
   *   rodape de pins ......... 665..868        -> 203
   *   acordeao ............... 28,5 | item ... 31,5 | cartao ... 72
   */
  memories: {
    /** 239 de conteudo + 1 de borda direita. */
    navWidth: 240,
    navHeader: {
      height: 44,
      paddingX: 12,
      paddingY: 8,
      button: 28,
      buttonRadius: 4,
      iconSize: 16,
      /** `tConfig.fgHex + "60"` no app. */
      colorAlpha: 0.376,
    },
    primary: {
      /* Sem altura fixa: `py-2` (8+8) sobre `line-height` 19,5 do texto de 13px
       * fecha 35,5. Fixar 36 inflava o botao em meio pixel. */
      height: 35.5,
      radius: 6,
      paddingX: 12,
      paddingY: 8,
      gap: 8,
      fontSize: 13,
      lineHeight: 19.5,
      iconSize: 15,
      marginBottom: 8,
      /** O app escreve `color: "#fff"` no botao de acento. */
      color: "#ffffff",
    },
    ghost: {
      height: 32,
      /** `px-3` no bloco que envolve o botao principal e a grade. */
      paddingX: 12,
      gap: 6,
      radius: 6,
      iconSize: 14,
      columns: 4,
      /** `tConfig.fgHex + "86"` no app. */
      colorAlpha: 0.525,
      /** `tConfig.bgHex + "80"`. */
      backgroundAlpha: 0.5,
      borderWidth: 1,
    },
    accordion: {
      /* 6 + 16,5 + 6 = 28,5: a altura vem do `py-1.5` sobre `line-height` 16,5. */
      height: 28.5,
      paddingX: 12,
      paddingY: 6,
      gap: 6,
      fontSize: 11,
      lineHeight: 16.5,
      /** `tracking-wider` = 0,05em sobre 11px. */
      letterSpacing: "0.55px",
      chevron: 12,
      /** `tConfig.fgHex + "70"`. */
      colorAlpha: 0.44,
    },
    card: {
      /** `px-2 py-1` em volta do cartao. */
      marginX: 8,
      marginY: 4,
      height: 72,
      radius: 8,
      paddingX: 8,
      paddingY: 6,
      nameSize: 12,
      nameLineHeight: 15,
      descriptionSize: 10,
      descriptionLineHeight: 12.5,
      /** `linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.62) 100%)`. */
      overlayStart: 20,
      overlayAlpha: 0.62,
    },
    item: {
      height: 31.5,
      paddingX: 12,
      paddingY: 6,
      gap: 10,
      fontSize: 13,
      lineHeight: 19.5,
      iconSize: 15,
      /** `tConfig.accentHex + "12"`. */
      activeAlpha: 0.07,
      /** `tConfig.fgHex + "CC"`. */
      inactiveAlpha: 0.8,
    },
    tags: {
      paddingX: 12,
      paddingY: 4,
      gap: 4,
      /** Duas linhas visiveis: `maxHeight = 2 * 22`. */
      maxLines: 2,
      lineStep: 22,
      chip: {
        height: 19.75,
        radius: 4,
        paddingX: 6,
        paddingY: 2,
        fontSize: 11,
        lineHeight: 13.75,
        gap: 4,
        /** `tConfig.accentHex + "12"`. */
        backgroundAlpha: 0.07,
        /** `tConfig.fgHex + "85"`. */
        colorAlpha: 0.52,
        countAlpha: 0.6,
      },
      more: {
        marginTop: 4,
        fontSize: 11,
        lineHeight: 16.5,
        /** `tConfig.fgHex + "50"`. */
        colorAlpha: 0.314,
      },
    },
    tasks: {
      paddingX: 12,
      paddingY: 4,
      gap: 2,
      row: {
        height: 28,
        radius: 4,
        paddingX: 8,
        paddingY: 6,
        gap: 8,
        fontSize: 12,
        lineHeight: 16,
        /** `tConfig.fgHex + "B5"`. */
        colorAlpha: 0.71,
        /** `tConfig.fgHex + "55"` na contagem. */
        countAlpha: 0.33,
        dot: 8,
      },
      emptyFontSize: 11,
    },
    pins: {
      panelPaddingX: 12,
      switcher: {
        height: 29,
        radius: 6,
        padding: 2,
        /** `text-[10px] font-medium` nos quatro periodos. */
        fontSize: 10,
        lineHeight: 15,
      },
      row: {
        gap: 8,
        labelSize: 13,
        labelLineHeight: 19.5,
        valueSize: 12,
        valueLineHeight: 18,
      },
    },
    divider: {
      marginX: 12,
      marginY: 8,
    },
  },

  /**
   * O painel do meio e o painel da entrada — os dois que a recriacao antiga nao
   * tinha. O do meio lista os registros por mes; o da entrada e o registro
   * aberto em `split`: capa, cabecalho, chips e os dois paineis.
   */
  journal: {
    /** 379 de conteudo + 1 de borda direita. */
    panelWidth: 380,
    header: {
      paddingX: 16,
      paddingY: 12,
      /** `space-y-3` entre a linha do titulo e o seletor de vistas. */
      gap: 12,
      iconBox: 32,
      iconRadius: 4,
      /** `tConfig.accentHex + "20"`. */
      iconBackgroundAlpha: 0.125,
      iconSize: 16,
      nameSize: 14,
      nameLineHeight: 20,
      descriptionSize: 12,
      descriptionLineHeight: 16,
      /** `tConfig.fgHex + "80"`. */
      descriptionAlpha: 0.5,
      actionButton: 28,
      actionIcon: 14,
      /** `tConfig.fgHex + "60"`. */
      actionAlpha: 0.376,
    },
    switcher: {
      height: 28.5,
      padding: 2,
      gap: 2,
      radius: 8,
      itemRadius: 6,
      itemPaddingX: 8,
      itemPaddingY: 4,
      itemGap: 6,
      itemFontSize: 11,
      itemLineHeight: 16.5,
      iconSize: 13,
      activeShadow: "0 1px 2px rgba(0,0,0,0.08)",
      /** `tConfig.fgHex + "70"` no item inativo. */
      inactiveAlpha: 0.44,
    },
    search: {
      paddingX: 12,
      paddingY: 8,
      height: 28,
      radius: 4,
      fieldPaddingX: 8,
      fieldPaddingY: 4,
      gap: 4,
      iconSize: 12,
      fontSize: 12,
      lineHeight: 16,
      /** `tConfig.fgHex + "60"` no placeholder e no icone. */
      colorAlpha: 0.376,
      /** A caixa do botao de exportar (`p-1` em volta de um icone de 12). */
      actionBox: 20,
    },
    list: {
      filterRowHeight: 17,
      monthHeight: 33.5,
      monthPaddingX: 12,
      monthPaddingY: 8,
      monthFontSize: 11,
      monthLineHeight: 16.5,
      /** `tConfig.fgHex + "80"`. */
      monthAlpha: 0.5,
      tracking: "0.55px",
      countSize: 10,
      countAlpha: 0.5,
      chevron: 12,
      rowHeight: 76,
      rowPaddingX: 12,
      rowPaddingY: 10,
      rowGap: 10,
      /** `w-8`: a coluna do dia tem 32. */
      dateWidth: 32,
      daySize: 18,
      dayLineHeight: 18,
      monthSize: 10,
      shortMonthLineHeight: 12.5,
      /** `tConfig.fgHex + "50"` no mes abreviado. */
      shortMonthAlpha: 0.314,
      titleSize: 14,
      titleLineHeight: 20,
      summarySize: 12,
      summaryLineHeight: 16,
      /** `tConfig.fgHex + "55"` no resumo. */
      summaryAlpha: 0.333,
      thumb: 40,
      /** `tConfig.accentHex + "0C"` na linha selecionada. */
      selectedAlpha: 0.047,
    },
    entry: {
      coverHeight: 128,
      paddingX: 24,
      paddingY: 16,
      eyebrowSize: 11,
      eyebrowLineHeight: 16.5,
      eyebrowAlpha: 0.5,
      tracking: "0.55px",
      titleSize: 24,
      titleLineHeight: 32,
      /** `tracking-tight`. */
      titleTracking: "-0.6px",
      titleWeight: 700,
      actionButton: 28,
      actionGap: 4,
      chipsMarginTop: 12,
      chipHeight: 26.5,
      chipRadius: 9999,
      chipPaddingX: 8,
      chipPaddingY: 4,
      chipGap: 6,
      chipFontSize: 11,
      chipLineHeight: 16.5,
      chipIcon: 11,
      /** `tConfig.accentHex + "14"` no chip preenchido. */
      chipActiveAlpha: 0.08,
      /** `tConfig.fgHex + "75"` no chip vazio, sobre o fundo do tema. */
      chipIdleAlpha: 0.46,
      /** `tConfig.fgHex + "45"` na contagem de palavras. */
      wordsAlpha: 0.27,
    },
    split: {
      previewPadding: 20,
      surfacePadding: 32,
      surfaceRadius: 20,
      surfaceBorder: 1,
      metadata: {
        padding: 18,
        radius: 18,
        /** `.ml-frontmatter-card` = `margin-bottom: var(--ml-preview-block-gap, 22px)`. */
        marginBottom: 22,
        titleSize: 11,
        titleLineHeight: 16.5,
        /** `.ml-frontmatter-title` = `letter-spacing: 0.14em` sobre 11px. */
        titleTracking: "1.54px",
        titleWeight: 700,
        rowSize: 12,
        rowLineHeight: 16,
        rowGapX: 16,
      },
      prose: {
        pSize: 16,
        /** `--ml-preview-p-line-height: 1.72`. */
        pLineHeight: 27.52,
        pMarginBottom: 14,
        pWeight: 420,
        /* `clamp(1.8rem, 2.6vw, 2.4rem)`: em 1440 a viewport manda, 2,6vw. */
        h2Size: 37.44,
        h2LineHeight: 40.44,
        h2Weight: 760,
        h2Tracking: "-0.02em",
        h2MarginTop: 28,
        h2MarginBottom: 14,
        listIndent: 28,
        listLineHeight: 26.56,
        listWeight: 430,
        listItemGap: 8,
        linkWeight: 650,
        linkUnderline: 2,
        /** `li::marker` usa o acento com peso 760. */
        markerWeight: 760,
      },
    },
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
