import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Code,
  Columns2,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  LucideIcon,
  MapPin,
  Minus,
  PanelLeft,
  PenLine,
  Plus,
  Save,
  Search,
  Square,
  Table,
  Timer,
  X,
} from "lucide-react";
import { APP_METRICS, MONO_FONT, UI_FONT } from "@/aurora/app-metrics";
import {
  Palette,
  Segment,
  alpha,
  between,
  foldableLines,
  paletteOf,
  segmentStyle,
  tokenPalette,
  tokenize,
} from "@/aurora/app-window-tokens";
import type { RecordTheme } from "@/aurora/theme-tokens";
import "@/aurora/cal-sans.css";

/* ---------------------------------------------------------------------------
 * A janela do aplicativo, recriada com as medidas do DOM real.
 *
 * Cada propriedade de tamanho, cor e fonte sai de `APP_METRICS` (que vem de
 * `medidas.json`) ou de um dos sete hex do tema. O que e layout estrutural —
 * `flex`, `overflow`, `minWidth: 0` — fica inline tambem, para o componente nao
 * depender de nenhuma classe utilitaria do site: a janela e uma peca medida, e
 * nao um desenho aproximado que herda escala do Tailwind.
 * ------------------------------------------------------------------------ */

const M = APP_METRICS;

/* ---------------------------------------------------------------------------
 * Icones
 *
 * O cromo usa `DualToneIcon`: duas copias do mesmo glifo, a de tras deslocada
 * 0,55px e mais clara. E o desenho do aplicativo, e e o que da o peso do traco
 * na captura — um icone de uma camada so fica visivelmente mais leve.
 * ------------------------------------------------------------------------ */

const DuoIcon = ({
  icon: Icon,
  size,
  palette,
}: {
  icon: LucideIcon;
  size: number;
  palette: Palette;
}) => (
  <span
    aria-hidden="true"
    style={{
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: M.chrome.toolbar.iconBox,
      height: M.chrome.toolbar.iconBox,
      flex: "0 0 auto",
    }}
  >
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: between(palette.fg, palette.ui, 72),
        transform: `translate(${M.chrome.toolbar.iconBackShift}px, ${M.chrome.toolbar.iconBackShift}px)`,
      }}
    >
      <Icon size={size} strokeWidth={M.chrome.toolbar.iconBackStroke} />
    </span>
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: palette.fg,
      }}
    >
      <Icon size={size} strokeWidth={M.chrome.toolbar.iconStroke} />
    </span>
  </span>
);

/** Botao quadrado sem fundo do cromo: 36px na faixa de abas, 32px na lateral. */
const ChromeButton = ({
  children,
  size,
  height,
  radius,
  part,
  label,
  fill,
}: {
  children: ReactNode;
  size: number;
  height: number;
  radius: number;
  part: string;
  /** Nome acessivel. Sem ele o botao e decorativo (`aria-hidden`). */
  label?: string;
  /** Fundo do botao — o "Novo registro" e o unico com acento. */
  fill?: string;
}) => (
  <span
    data-stage-part={part}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : "true"}
    title={label}
    style={{
      boxSizing: "border-box",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height,
      flex: "0 0 auto",
      border: "1px solid transparent",
      borderRadius: radius,
      background: fill ?? "transparent",
      fontWeight: 500,
    }}
  >
    {children}
  </span>
);

/* ---------------------------------------------------------------------------
 * Barra de titulo
 * ------------------------------------------------------------------------ */

const TOOLBAR_ACTIONS: Array<{ id: string; icon: LucideIcon }> = [
  { id: "bold", icon: Bold },
  { id: "italic", icon: Italic },
  { id: "code", icon: Code },
  { id: "link", icon: Link2 },
  { id: "image", icon: ImageIcon },
  { id: "table", icon: Table },
  { id: "lists", icon: List },
];

/**
 * As acoes da faixa de cima sao **as mesmas nas tres leituras**: medido no app
 * em Memorias, a barra de titulo traz os sete botoes de formatacao do Editor.
 * Havia aqui uma faixa do diario (Novo registro, Calendario, Galeria, Lugares)
 * que o aplicativo nao tem — ela saiu com a medicao que a desmentiu.
 */

/** Em janela estreita a faixa de edicao cede: sobram busca, um ou dois formatos
 *  e exportar. A ordem se mantem — e a mesma faixa, com menos botoes. */
const NARROW_FORMATTING = TOOLBAR_ACTIONS.slice(0, 2);
const TINY_FORMATTING = TOOLBAR_ACTIONS.slice(0, 1);

export interface ActionLabels {
  formatting: string;
  newEntry: string;
  calendar: string;
  gallery: string;
  places: string;
}

/**
 * A faixa de edicao do app: **um** grupo de sete botoes, e nada mais.
 *
 * Havia aqui uma lupa a esquerda e um "exportar" a direita, em volta da caixa
 * de formatacao. Nao existem: medido no app em 1440, a faixa de acoes tem
 * exatamente uma secao (`editing`), de 278px, centrada na regiao entre o menu e
 * o seletor de modo — e zero separadores verticais. Os dois botoes inventados
 * eram a maior divergencia do cromo, e uma lupa entre "Exibir" e "Negrito" ainda
 * mentia sobre a vizinhanca: busca mora na faixa de abas, exportar mora no menu
 * Arquivo e no cabecalho da lateral.
 */
const EditorActions = ({
  palette,
  labels,
  narrow,
  veryNarrow,
}: {
  palette: Palette;
  labels: ActionLabels;
  narrow: boolean;
  veryNarrow: boolean;
}) => {
  /* Em janela estreita o app nao mostra dois botoes de formatacao: mostra o
   * primeiro e um selo com o que sobrou ("+6"). Medido na captura de 390. */
  const formatting = narrow ? TINY_FORMATTING : TOOLBAR_ACTIONS;
  const hidden = TOOLBAR_ACTIONS.length - formatting.length;
  return (
    /* A caixa de formatacao tem a largura que o app calculou (278) — e ela que
     * fica centrada na faixa. Em janela estreita a caixa perde o respiro que so
     * faz sentido no tamanho real. */
    <div
      data-stage-part="toolbar"
      aria-label={labels.formatting}
      role="group"
      style={{
        width: narrow ? undefined : M.chrome.toolbar.width,
        height: M.chrome.toolbar.height,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: narrow ? 0 : M.chrome.toolbar.gap,
          padding: narrow ? 0 : `0 ${M.chrome.toolbar.paddingX}px`,
        }}
      >
        {/* A coluna do rotulo da secao existe sempre no app, com largura zero.
         *  Ela nao e enfeite: os 14px que separam a borda da caixa do primeiro
         *  botao sao 6 de padding + estes 0 + 8 de gap. */}
        {narrow ? null : <span style={{ width: 0, flex: "0 0 auto" }} />}
        <span style={{ display: "flex", alignItems: "center", gap: M.chrome.toolbar.itemGap }}>
          {formatting.map(({ id, icon }) => (
            <ChromeButton
              key={id}
              part="toolbar-button"
              size={M.chrome.toolbar.button}
              height={M.chrome.toolbar.button}
              radius={M.chrome.toolbar.buttonRadius}
            >
              <DuoIcon icon={icon} size={M.chrome.toolbar.iconSize} palette={palette} />
            </ChromeButton>
          ))}
          {hidden > 0 ? (
            <span
              data-stage-part="toolbar-overflow"
              style={{
                height: M.chrome.toolbar.button,
                display: "inline-flex",
                alignItems: "center",
                padding: `0 ${M.chrome.menu.paddingX}px`,
                fontSize: M.chrome.menu.fontSize,
                lineHeight: `${M.chrome.toolbar.height}px`,
              }}
            >
              +{hidden}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
};

const WindowControls = ({ palette }: { palette: Palette }) => (
  <div
    data-stage-part="window-controls"
    aria-hidden="true"
    style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: M.chrome.windowControls.width,
      height: M.chrome.windowControls.height,
      display: "flex",
      color: palette.fg,
      fontSize: 16,
      lineHeight: "24px",
    }}
  >
    <span style={{ width: M.chrome.windowControls.button, display: "grid", placeItems: "center" }}>
      <Minus size={M.chrome.windowControls.iconSize} strokeWidth={1.5} />
    </span>
    <span style={{ width: M.chrome.windowControls.button, display: "grid", placeItems: "center" }}>
      <Square size={M.chrome.windowControls.maximizeIconSize} strokeWidth={1.5} />
    </span>
    <span style={{ width: M.chrome.windowControls.button, display: "grid", placeItems: "center" }}>
      <X size={M.chrome.windowControls.iconSize} strokeWidth={1.5} />
    </span>
  </div>
);

interface TitleBarProps {
  palette: Palette;
  menus: string[];
  modeNames: [string, string];
  mode: StageMode;
  brand: string;
  labels: ActionLabels;
  /** Janela estreita: menus, nome do produto e controles saem; as acoes ficam. */
  narrow?: boolean;
  /** Abaixo de 420px o seletor de modo sai: os rotulos nao cabem, e a leitura ja
   *  esta nomeada nas abas do proprio site. */
  veryNarrow?: boolean;
}

const TitleBar = ({ palette, menus, modeNames, mode, brand, labels, narrow = false, veryNarrow = false }: TitleBarProps) => (
  <div
    data-stage-part="titlebar"
    style={{
      boxSizing: "border-box",
      height: M.chrome.height + M.chrome.borderBottom,
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      gap: 0,
      padding: `0 ${M.chrome.paddingX}px`,
      position: "relative",
      background: palette.ui,
      color: palette.fg,
      borderBottom: `${M.chrome.borderBottom}px solid ${palette.border}`,
      fontFamily: UI_FONT,
      fontSize: M.chrome.fontSize,
      lineHeight: `${M.chrome.lineHeight}px`,
    }}
  >
    <div style={{ display: narrow ? "none" : "flex", alignItems: "center", gap: M.chrome.brand.gap, minWidth: 0, flexShrink: 0 }}>
      <img
        data-stage-part="brand-tile"
        src={brand}
        alt=""
        aria-hidden="true"
        style={{
          width: M.chrome.brand.tile,
          height: M.chrome.brand.tile,
          boxSizing: "border-box",
          flex: "0 0 auto",
          borderRadius: M.chrome.brand.tileRadius,
          border: `1px solid ${palette.border}`,
          objectFit: "fill",
        }}
      />
      <span
        data-stage-part="brand-name"
        style={{
          display: narrow ? "none" : "inline",
          fontSize: M.chrome.brand.nameSize,
          fontWeight: M.chrome.brand.nameWeight,
          lineHeight: `${M.chrome.brand.nameLineHeight}px`,
          letterSpacing: "0.025em",
          whiteSpace: "nowrap",
        }}
      >
        Mark-Lee
      </span>
    </div>

    {/* O menu so existe no Editor: em Memorias, como no app, ele nao tem item
     *  — e um menu quase vazio e pior do que nenhum. */}
    <div
      role="menubar"
      aria-label={menus[0]}
      style={{ display: narrow || mode === "memories" ? "none" : "flex", alignItems: "center", flexShrink: 0 }}
    >
      {menus.map((menu) => (
        <span
          key={menu}
          role="menuitem"
          data-stage-part="menu-item"
          style={{
            height: M.chrome.menu.height,
            boxSizing: "border-box",
            display: "inline-flex",
            alignItems: "center",
            padding: `${M.chrome.menu.paddingY}px ${M.chrome.menu.paddingX}px`,
            borderRadius: M.chrome.menu.radius,
            fontSize: M.chrome.menu.fontSize,
            lineHeight: `${M.chrome.menu.lineHeight}px`,
            whiteSpace: "nowrap",
          }}
        >
          {menu}
        </span>
      ))}
    </div>

    <div
      data-stage-part="action-bar"
      style={{
        flex: "1 1 0",
        minWidth: 0,
        height: M.chrome.toolbar.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* A faixa de acoes NAO muda com a leitura. Medido no app em Memorias: a
       *  barra de titulo traz os mesmos sete botoes de formatacao do Editor —
       *  nao existe uma "faixa do diario" com Novo registro/Calendario/Galeria/
       *  Lugares. Aquela faixa era invencao da recriacao e saiu junto com a
       *  medicao que a desmentiu. */}
      <EditorActions palette={palette} labels={labels} narrow={narrow} veryNarrow={veryNarrow} />
    </div>

    <div
      data-stage-part="mode-switcher"
      style={{
        height: M.chrome.switcher.height,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        border: `${M.chrome.switcher.border}px solid ${palette.border}`,
        borderRadius: M.chrome.switcher.radius,
      }}
    >
      {(["editor", "memories"] as const).map((id, index) => {
        const active = id === mode;
        return (
          <span
            key={id}
            data-stage-part={active ? "mode-active" : "mode-inactive"}
            style={{
              height: M.chrome.switcher.itemHeight,
              boxSizing: "border-box",
              display: "inline-flex",
              alignItems: "center",
              padding: `${M.chrome.switcher.paddingY}px ${M.chrome.switcher.paddingX}px`,
              fontSize: M.chrome.switcher.fontSize,
              fontWeight: M.chrome.switcher.fontWeight,
              lineHeight: `${M.chrome.switcher.lineHeight}px`,
              whiteSpace: "nowrap",
              background: active ? palette.accent : "transparent",
              color: active ? palette.bg : palette.fg,
              borderRadius:
                index === 0
                  ? `${M.chrome.switcher.radius}px 0 0 ${M.chrome.switcher.radius}px`
                  : `0 ${M.chrome.switcher.radius}px ${M.chrome.switcher.radius}px 0`,
            }}
          >
            {modeNames[index]}
          </span>
        );
      })}
    </div>

    <div style={{ width: M.chrome.windowControls.width, flexShrink: 0 }} aria-hidden="true" />
    <WindowControls palette={palette} />
  </div>
);

/* ---------------------------------------------------------------------------
 * Faixa de abas
 * ------------------------------------------------------------------------ */

interface TabStripProps {
  palette: Palette;
  fileName: string;
  closeLabel: string;
}

const TabStrip = ({ palette, fileName, closeLabel }: TabStripProps) => (
  <div
    data-stage-part="tab-strip"
    style={{
      boxSizing: "border-box",
      height: M.tabs.height,
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      padding: `0 ${M.tabs.paddingX}px`,
      background: palette.ui,
      color: palette.fg,
      borderBottom: `${M.tabs.borderBottom}px solid ${palette.border}`,
      fontFamily: UI_FONT,
    }}
  >
    <ChromeButton part="tab-button-sidebar" size={M.tabs.button} height={M.tabs.button} radius={M.tabs.buttonRadius}>
      <PanelLeft size={M.tabs.iconSize} strokeWidth={1.7} color={palette.fg} />
    </ChromeButton>
    <ChromeButton part="tab-button-search" size={M.tabs.button} height={M.tabs.button} radius={M.tabs.buttonRadius}>
      <Search size={M.tabs.iconSize} strokeWidth={1.7} color={palette.fg} />
    </ChromeButton>

    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", gap: M.tabs.gap }}>
      <span style={{ width: 0, flex: "0 0 auto" }} />
      <div
        data-stage-part="tab"
        style={{
          height: M.tabs.tabHeight,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: M.tabs.tabGap,
          padding: `0 ${M.tabs.tabPaddingX}px`,
          borderRadius: M.tabs.tabRadius,
          border: "1px solid transparent",
          background: alpha(palette.fg, M.tabs.activeAlpha),
          color: palette.fg,
          fontSize: M.tabs.fontSize,
          lineHeight: `${M.tabs.lineHeight}px`,
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
        <span
          aria-hidden="true"
          aria-label={closeLabel}
          style={{
            width: M.tabs.closeBox,
            height: M.tabs.closeBox,
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: M.tabs.closeOpacity,
          }}
        >
          <X size={M.tabs.closeIcon} strokeWidth={1.9} />
        </span>
      </div>
    </div>

    <div
      aria-hidden="true"
      style={{ width: 1, height: M.tabs.button, flex: "0 0 auto", margin: `0 ${M.tabs.paddingX}px`, background: palette.border }}
    />
    <ChromeButton part="tab-button-new" size={M.tabs.button} height={M.tabs.button} radius={M.tabs.buttonRadius}>
      <Plus size={M.tabs.iconSize} strokeWidth={1.7} color={palette.fg} />
    </ChromeButton>
    <span style={{ width: M.tabs.gap, flex: "0 0 auto" }} />
    <ChromeButton part="tab-button-split" size={M.tabs.button} height={M.tabs.button} radius={M.tabs.buttonRadius}>
      <Columns2 size={M.tabs.iconSize} strokeWidth={1.7} color={palette.fg} />
    </ChromeButton>
  </div>
);

/* ---------------------------------------------------------------------------
 * Lateral do workspace
 * ------------------------------------------------------------------------ */

export interface StageTreeRow {
  depth: number;
  name: string;
  kind: "dir" | "file";
  open?: boolean;
  active?: boolean;
}

interface SidebarProps {
  palette: Palette;
  rows: StageTreeRow[];
  workspace: string;
  search: string;
}

const WorkspaceSidebar = ({ palette, rows, workspace, search }: SidebarProps) => (
  <div
    data-stage-part="sidebar"
    style={{
      boxSizing: "border-box",
      width: M.sidebar.width,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      background: palette.ui,
      color: palette.fg,
      borderRight: `${M.sidebar.borderRight}px solid ${palette.border}`,
      fontFamily: UI_FONT,
    }}
  >
    <div
      data-stage-part="sidebar-header"
      style={{
        height: M.sidebar.header.height,
        boxSizing: "border-box",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: M.sidebar.header.gap,
        padding: `0 ${M.sidebar.header.paddingX}px`,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <ChromeButton
        part="sidebar-button"
        size={M.sidebar.header.button}
        height={M.sidebar.header.height}
        radius={M.sidebar.header.buttonRadius}
      >
        <Save size={M.sidebar.header.iconSize} strokeWidth={1.9} color={palette.fg} />
      </ChromeButton>
      <ChromeButton
        part="sidebar-button"
        size={M.sidebar.header.button}
        height={M.sidebar.header.height}
        radius={M.sidebar.header.buttonRadius}
      >
        <FilePlus2 size={M.sidebar.header.iconSize} strokeWidth={1.9} color={palette.fg} />
      </ChromeButton>
      <ChromeButton
        part="sidebar-button"
        size={M.sidebar.header.button}
        height={M.sidebar.header.height}
        radius={M.sidebar.header.buttonRadius}
      >
        <FolderPlus size={M.sidebar.header.iconSize} strokeWidth={1.9} color={palette.fg} />
      </ChromeButton>
      <span style={{ flex: "1 1 0" }} />
      <ChromeButton
        part="sidebar-button"
        size={M.sidebar.header.button}
        height={M.sidebar.header.height}
        radius={M.sidebar.header.buttonRadius}
      >
        <FolderOpen size={M.sidebar.header.iconSize} strokeWidth={1.9} color={palette.fg} />
      </ChromeButton>
    </div>

    <div
      data-stage-part="sidebar-search-block"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: M.sidebar.search.blockGap,
        padding: M.sidebar.search.blockPadding,
        flex: "0 0 auto",
      }}
    >
      <div
        data-stage-part="sidebar-search-box"
        style={{
          height: M.sidebar.search.height,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: M.sidebar.search.gap,
          padding: `${M.sidebar.search.paddingY}px ${M.sidebar.search.paddingX}px`,
          borderRadius: M.sidebar.search.radius,
          background: alpha("#000000", M.sidebar.search.backgroundAlpha),
        }}
      >
        {/* O icone do app e um `<Search size={14}>` encolhido pelo flex ate 12,72:
         *  a lupa fica com a cor cheia do texto, e nao com o meio-tom do
         *  placeholder — medido no app, o traco chega a rgb(230, 234, 248) sobre
         *  um fundo de rgb(10, 17, 30). */}
        <Search
          size={M.sidebar.search.iconSize}
          strokeWidth={1.9}
          color={palette.fg}
          style={{ flex: "0 1 auto", minWidth: 0 }}
        />
        <span
          style={{
            /* `w-full` no input do app: a base e a largura do container, e o
             *  flex encolhe os dois itens na proporcao do tamanho — e o que poe o
             *  texto em x=36,72, nao em 37. */
            width: "100%",
            minWidth: 0,
            flex: "0 1 auto",
            fontSize: M.sidebar.search.fontSize,
            lineHeight: `${M.sidebar.search.lineHeight}px`,
            color: alpha(palette.fg, 0.5),
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {search}
        </span>
      </div>
      <div
        style={{
          padding: `${M.sidebar.label.blockPaddingY}px ${M.sidebar.label.paddingX}px 0`,
        }}
      >
        <span
          data-stage-part="sidebar-label"
          style={{
            display: "block",
            fontSize: M.sidebar.label.fontSize,
            fontWeight: M.sidebar.label.fontWeight,
            lineHeight: `${M.sidebar.label.lineHeight}px`,
            letterSpacing: M.sidebar.label.letterSpacing,
            textTransform: "uppercase",
            opacity: M.sidebar.label.opacity,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {workspace}
        </span>
      </div>
    </div>

    <div data-stage-part="sidebar-tree" style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", padding: M.sidebar.tree.padding }}>
      <div style={{ padding: M.sidebar.tree.listPadding, borderRadius: M.sidebar.tree.listRadius }}>
        {rows.map((row) => (
          <div
            key={`${row.depth}-${row.name}`}
            data-stage-part="tree-row"
            data-stage-active={row.active ? "true" : undefined}
            style={{
              height: M.sidebar.tree.rowHeight,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: M.sidebar.tree.gap,
              paddingTop: 4,
              paddingBottom: 4,
              paddingRight: M.sidebar.tree.rowPaddingX,
              paddingLeft: M.sidebar.tree.rowPaddingX + row.depth * M.sidebar.tree.indent,
              borderRadius: M.sidebar.tree.rowRadius,
              background: row.active ? alpha(palette.fg, M.sidebar.tree.activeAlpha) : "transparent",
              color: palette.fg,
              fontSize: M.sidebar.tree.fontSize,
              lineHeight: `${M.sidebar.tree.lineHeight}px`,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {row.kind === "dir" ? (
              row.open ? (
                <ChevronDown size={M.sidebar.tree.chevronSize} strokeWidth={1.9} style={{ flex: "0 0 auto" }} />
              ) : (
                <ChevronRight size={M.sidebar.tree.chevronSize} strokeWidth={1.9} style={{ flex: "0 0 auto" }} />
              )
            ) : (
              /* A coluna do chevron existe mesmo quando nao ha chevron: o
               * aplicativo reserva os mesmos 14px, e sem ela o nome do arquivo
               * encosta 22px a esquerda do que no app. */
              <span aria-hidden="true" style={{ width: M.sidebar.tree.chevronSize, flex: "0 0 auto" }} />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
 * Painel de codigo
 * ------------------------------------------------------------------------ */

/** O glifo que o CodeMirror desenha na coluna de dobra (U+2304). */
const FOLD_OPEN = "\u2304";

interface CodePaneProps {
  palette: Palette;
  segments: Segment[][];
  activeLine: boolean;
  gutter: boolean;
}

const CodePane = ({ palette, segments, activeLine, gutter }: CodePaneProps) => {
  const tokens = tokenPalette(palette);
  const folds = foldableLines(segments.map((line) => line.map((segment) => segment.text).join("")));
  return (
    /* Corte seco, como o app: a ultima linha visivel termina na borda do painel,
     * sem degrade. O degrade de continuidade existia aqui e foi removido por
     * decisao: um painel que imita o aplicativo nao pode inventar um efeito que
     * o aplicativo nao tem.
     *
     * O QUE MUDOU (defeito real, medido): o painel usava `white-space: pre` e
     * cortava a linha longa na borda — em 1440 a primeira linha do documento
     * perdia 93px ("...alta o bast" e o resto sumia), em 768 perdia 505px. Agora
     * cada linha e uma LINHA de layout (numero | dobra | texto) e o texto quebra
     * dentro da coluna: `pre-wrap` + `overflow-wrap: anywhere` + `word-break:
     * break-word`. O corte horizontal deixou de existir; o vertical fica porque
     * o documento e mais longo que a janela, e ali o app tambem corta.
     *
     * A linha virou linha de layout (em vez de tres colunas) porque com quebra
     * de texto o numero precisa acompanhar a PRIMEIRA linha visual do paragrafo
     * — em colunas separadas a calha desanda na primeira linha que ocupa tres. */
    <div
      data-stage-part="editor-pane"
      style={{
        flex: "1 1 0",
        minWidth: 0,
        minHeight: 0,
        overflowX: "clip",
        overflowY: "hidden",
        position: "relative",
        background: palette.editorBg,
        color: palette.editorFg,
        fontFamily: MONO_FONT,
        fontSize: M.editor.fontSize,
        lineHeight: `${M.editor.lineHeight}px`,
        padding: `${M.editor.contentPaddingY}px 0`,
        boxSizing: "border-box",
      }}
    >
      {segments.map((line, index) => (
        <div
          key={index}
          data-stage-part="line"
          style={{
            display: "flex",
            alignItems: "flex-start",
            background:
              index === 0 && activeLine
                ? alpha(palette.editorFg, palette.light ? M.editor.activeLineAlphaGolden : M.editor.activeLineAlpha)
                : "transparent",
          }}
        >
          {gutter ? (
            <>
              {/* O numero (25,5938) e a dobra (18,3906) sao colunas do app: sem a
               * dobra o texto comecaria 18,39px a esquerda do que comeca la. */}
              <span
                data-stage-part="gutter-number"
                style={{
                  boxSizing: "border-box",
                  width: M.editor.numberWidth,
                  flex: "0 0 auto",
                  paddingLeft: M.editor.numberPaddingLeft,
                  paddingRight: M.editor.numberPaddingRight,
                  textAlign: "right",
                  lineHeight: `${M.editor.gutterLineHeight}px`,
                  color: index === 0 && activeLine ? palette.editorFg : alpha(palette.editorFg, M.editor.numberAlpha),
                }}
              >
                {index + 1}
              </span>
              <span
                data-stage-part="gutter-fold"
                data-stage-fold={folds[index] ? "true" : undefined}
                style={{
                  boxSizing: "border-box",
                  width: M.editor.foldWidth,
                  flex: "0 0 auto",
                  padding: `0 ${M.editor.foldPaddingX}px`,
                  textAlign: "center",
                  lineHeight: `${M.editor.gutterLineHeight}px`,
                  /* A cor da coluna de dobra no app e a do gutter do tema escuro
                   * (`#7d8799`), e nao a do texto — o `color` de `.cm-gutters`
                   * perde para o tema do CodeMirror. */
                  color: tokens.quote,
                }}
              >
                {folds[index] ? FOLD_OPEN : ""}
              </span>
            </>
          ) : null}
          <div
            style={{
              flex: "1 1 0",
              minWidth: 0,
              /* `minHeight` e nao `height`: linha vazia nao tem texto e encolheria
               * para a altura da calha (22,4), fazendo o texto descer 3,2px a cada
               * linha vazia. */
              minHeight: M.editor.lineHeight,
              boxSizing: "border-box",
              paddingLeft: M.editor.linePaddingLeft,
              paddingRight: M.editor.linePaddingRight + M.editor.contentRightReserve,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {line.map((segment, segmentIndex) => (
              <span key={segmentIndex} style={segmentStyle(segment.tone, tokens)}>
                {segment.text}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * Barra de status
 * ------------------------------------------------------------------------ */

interface StatusBarProps {
  palette: Palette;
  fileName: string;
  saved: string;
  draft?: string;
  /** Janela estreita: o relogio sai para o nome do arquivo respirar. */
  narrow?: boolean;
  /** A vista em vigor, no canto direito. Em Memorias o app escreve "split". */
  view?: string;
}

const StatusBar = ({ palette, fileName, saved, draft, narrow = false, view = "edit" }: StatusBarProps) => (
  <div
    data-stage-part="status"
    style={{
      boxSizing: "border-box",
      height: M.status.height,
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: `0 ${M.status.paddingX}px`,
      background: palette.ui,
      color: palette.fg,
      borderTop: `${M.status.borderTop}px solid ${palette.border}`,
      fontFamily: UI_FONT,
      fontSize: M.status.fontSize,
      lineHeight: `${M.status.lineHeight}px`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: M.status.gap, minWidth: 0 }}>
      <span data-stage-part="status-file" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
      <span
        data-stage-part="status-chip"
        style={{
          height: M.status.chip.height,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          gap: M.status.chip.gap,
          padding: `${M.status.chip.paddingY}px ${M.status.chip.paddingX}px`,
          borderRadius: M.status.chip.radius,
          border: `1px solid ${M.status.chipBorder}`,
          color: draft ? palette.fg : M.status.savedColor,
          opacity: draft ? 0.75 : 1,
          whiteSpace: "nowrap",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: M.status.chip.dot,
            height: M.status.chip.dot,
            borderRadius: M.status.chip.radius,
            background: "currentColor",
          }}
        />
        <span>{draft ?? saved}</span>
      </span>
    </div>

    <div data-stage-part="status-right" style={{ display: "flex", alignItems: "center", gap: M.status.gapRight, flexShrink: 0 }}>
      <span
        aria-hidden="true"
        style={{
          height: M.status.clock.height,
          boxSizing: "border-box",
          display: narrow ? "none" : "inline-flex",
          alignItems: "center",
          gap: M.status.clock.gap,
          padding: `${M.status.clock.paddingY}px ${M.status.clock.paddingX}px`,
          borderRadius: M.status.clock.radius,
          color: alpha(palette.fg, M.status.clock.opacity),
        }}
      >
        <Timer size={M.status.clock.iconSize} strokeWidth={1.9} />
      </span>
      {/* Na janela estreita o contador de abas FICA e o rotulo "editor" sai —
       *  e o que a captura de 390 mostra ("1 tabs" + "edit"). */}
      <span>1 tabs</span>
      {narrow ? null : <span>editor</span>}
      <span>{view}</span>
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
 * A janela
 * ------------------------------------------------------------------------ */

export type StageMode = "editor" | "memories";

/** Largura do proprio painel: as medidas sao fixas, mas o que cabe nelas nao e. */
const useWindowWidth = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0].contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

export interface StageDocument {
  fileName: string;
  lines: string[];
  tree: StageTreeRow[];
}

/** O que a janela ja sabe sobre o proprio tamanho, para o corpo se adaptar. */
export interface WindowContext {
  width: number;
  compact: boolean;
  narrow: boolean;
}

interface AppWindowProps {
  theme: RecordTheme;
  mode: StageMode;
  doc: StageDocument;
  menus: string[];
  modeNames: [string, string];
  workspace: string;
  search: string;
  saved: string;
  brand: string;
  closeLabel: string;
  /** Nomes das acoes da faixa de cima — ela muda com a leitura. */
  labels: ActionLabels;
  /** O selo da barra de status: "Salvo" no editor, "Rascunho" na entrada aberta. */
  draft?: string;
  /** A vista em vigor na barra de status ("edit" no editor, "split" em Memorias). */
  statusView?: string;
  /**
   * O nome que a barra de status mostra. Em Memorias o aplicativo reporta a aba
   * do editor — `Untitled.md`, com o selo `Rascunho` —, e nao o registro aberto.
   * E o que a captura de 02/11/2026 mostra; aqui a recriacao repete o app em vez
   * de corrigir o app por conta propria.
   */
  statusFile?: string;
  /**
   * Substitui o corpo inteiro. Memorias usa isto: ela nao tem faixa de abas, e
   * as colunas dela dependem da largura da janela — por isso a funcao.
   */
  children?: ReactNode | ((context: WindowContext) => ReactNode);
}

/**
 * A janela: barra de titulo, corpo e barra de status.
 *
 * A faixa de abas **nao** atravessa a janela: ela mora dentro da coluna do
 * editor, ao lado do cabecalho da lateral. E o que a medicao mostra — a faixa
 * comeca em x=260, nao em x=0 — e o que uma captura lado a lado denuncia na
 * hora: desenhar a faixa de ponta a ponta empurra o cabecalho da lateral para
 * baixo e a janela deixa de ser a do aplicativo.
 *
 * `children` substitui o corpo inteiro — e por ali que Memorias entra com as
 * colunas dela (sem faixa de abas, como no app).
 */
export const AppWindow = ({
  theme,
  mode,
  doc,
  menus,
  modeNames,
  workspace,
  search,
  saved,
  brand,
  closeLabel,
  labels,
  draft,
  statusView,
  statusFile,
  children,
}: AppWindowProps) => {
  const palette = paletteOf(theme);
  const segments = tokenize(doc.lines);
  const { ref, width } = useWindowWidth();
  /* A janela e medida em 1440px e o site a mostra em tamanho real no desktop.
   * Abaixo de 720px a lateral do editor sai (como no app, que a colapsa) e
   * abaixo de 640px saem os menus, o nome do produto e os controles de janela —
   * sem isso o cromo fica cortado em vez de encolher, que e o defeito que a
   * captura em 390 pega. */
  const compact = width > 0 && width < 720;
  const narrow = width > 0 && width < 640;
  const veryNarrow = width > 0 && width < 330;
  const body = typeof children === "function" ? children({ width, compact, narrow }) : children;

  return (
    <div
      ref={ref}
      data-stage-part="window"
      data-theme={theme.id}
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: M.windowRadius,
        background: palette.bg,
        color: palette.fg,
        fontFamily: UI_FONT,
        /* O aplicativo nao fixa tamanho na raiz: 16px e o padrao do navegador, e
         * cada barra declara o seu. Fixar 12px aqui mudaria o que herda. */
        fontSize: 16,
        lineHeight: "24px",
      }}
    >
      <TitleBar
        palette={palette}
        menus={menus}
        modeNames={modeNames}
        mode={mode}
        brand={brand}
        labels={labels}
        narrow={narrow}
        veryNarrow={veryNarrow}
      />
      <div style={{ flex: "1 1 0", minHeight: 0, display: "flex" }}>
        {body ?? (
          <>
            {compact ? null : (
              <WorkspaceSidebar palette={palette} rows={doc.tree} workspace={workspace} search={search} />
            )}
            <div style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <TabStrip palette={palette} fileName={doc.fileName} closeLabel={closeLabel} />
              <CodePane palette={palette} segments={segments} activeLine gutter />
            </div>
          </>
        )}
      </div>
      <StatusBar palette={palette} fileName={statusFile ?? doc.fileName} saved={saved} draft={draft} view={compact ? "edit" : statusView} narrow={narrow} />
    </div>
  );
};

export { CodePane };
