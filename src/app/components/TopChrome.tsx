import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolbarDropdown, { type ToolbarDropdownItem } from "./ToolbarDropdown";
import {
  Bold,
  CheckSquare,
  Code,
  Columns2,
  Download,
  Eye,
  FileInput,
  FilePlus2,
  FolderOpen,
  Focus,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  PanelLeft,
  Save,
  Settings2,
  PenLine,
  Table,
} from "lucide-react";
import { AppSettings, ThemeConfig } from "../../types";
import DualToneIcon from "./DualToneIcon";

type ToolbarSectionKey = keyof AppSettings["toolbarSections"];
type ToolbarAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcutId?: string;
  /** Quando presente, a ação é um **gatilho de dropdown** e `onClick` fica sem
   *  uso: quem responde é `ToolbarDropdown`, um item por entrada. Convive com
   *  `onClick` porque o modelo é construído por expressões condicionais e
   *  exigir um ou outro muda todas elas. */
  dropdownItems?: ToolbarDropdownItem[];
};
type ToolbarSectionModel = {
  key: ToolbarSectionKey;
  title: string;
  icon: React.ReactNode;
  actions: ToolbarAction[];
};

interface TopChromeProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  floatingToolbarAnchor: AppSettings["floatingToolbarAnchor"];
  sidebarEnabled: boolean;
  viewMode: "edit" | "split" | "preview";
  toolbarSections: AppSettings["toolbarSections"];
  toolbarItems: AppSettings["toolbarItems"];
  showToolbarSectionLabels: boolean;
  toolbarCompactBreakpoint: number;
  toolbarDisplayMode: AppSettings["toolbarDisplayMode"];
  toolbarSectionBehavior: AppSettings["toolbarSectionBehavior"];
  shortcutLabels: Record<string, string>;
  showShortcutHints: boolean;
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onSave: () => void;
  onExport: () => void;
  // `onFindReplace` saiu: era declarado, destruturado e listado em `deps` sem
  // nunca renderizar nada — a busca mora no editor, e o botão que a abre é o da
  // barra de abas. É a mesma classe do "item de menu que não abre nada", que as
  // notas da v1.8.0 já apontaram.
  onOpenSettings: () => void;
  onOpenSnippets: () => void;
  onCycleTheme: () => void;
  onToggleSidebar: () => void;
  onToggleZen: () => void;
  onViewModeChange: (mode: "edit" | "split" | "preview") => void;
  onFormatAction: (action: "bold" | "italic" | "code" | "link" | "image" | "ul" | "ol" | "task" | "table") => void;
  onTransformMarkdown: (mode: "format" | "minify") => void;
}

const TopChrome: React.FC<TopChromeProps> = ({
  t,
  tConfig,
  floatingToolbarAnchor,
  sidebarEnabled,
  viewMode,
  toolbarSections,
  toolbarItems,
  showToolbarSectionLabels,
  toolbarCompactBreakpoint,
  toolbarDisplayMode,
  toolbarSectionBehavior,
  shortcutLabels,
  showShortcutHints,
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onSave,
  onExport,
  onOpenSettings,
  onOpenSnippets,
  onCycleTheme,
  onToggleSidebar,
  onToggleZen,
  onViewModeChange,
  onFormatAction,
  onTransformMarkdown,
}) => {
  // `canControlWindow` saiu. O único consumidor era o `noDragStyle` condicional,
  // e ele virou incondicional — ver a definição abaixo, onde o motivo está.
  // `left`/`right` saíram do enumérico de `floatingToolbarAnchor`, e o `isVertical`
  // que governava o layout vertical foi removido junto. Não sobrou ramo
  // vertical: a barra é horizontal em todas as âncoras.
  // Dois desenhos. `icon_only` é o padrão e vale um quadrado: o nome vive no
  // `title` e no menu. `stacked` põe o rótulo **abaixo** do ícone — mais estreito
  // que o texto ao lado (118px medidos contra ~30px do ícone) e sem abrir mão do
  // nome. O ícone aparece sempre; `text_only` não existe mais.
  const empilhado = toolbarDisplayMode === "stacked";
  const showIcon = true;
  const showLabel = empilhado;

  const centerRef = useRef<HTMLDivElement | null>(null);
  const sectionFrameRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const overflowTriggerRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLButtonElement | null>>>({});
  const overflowPanelRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const sectionTitleRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const measureButtonRefs = useRef<Partial<Record<ToolbarSectionKey, Array<HTMLButtonElement | null>>>>({});
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Partial<Record<ToolbarSectionKey, number>>>({});
  // A largura de cada seção, publicada pelo próprio cálculo de overflow.
  //
  // Antes a seção ficava com `width: auto` e o navegador resolvia a largura
  // intrínseca — e ele **não** fecha o ciclo quando a seção tem um único filho em
  // bloco de largura automática (a etiqueta de grupo está desligada por padrão).
  // Medido: `max-content` resolvia 1337px e `fit-content` 771px, sempre os mesmos
  // valores, e **remover qualquer um dos 73 descendentes não mudava nada** — a
  // largura não vinha do conteúdo. Com `flex-shrink: 0` as quatro seções estouravam
  // e as três últimas saíam da tela: 2 ícones visíveis em vez de 12.
  //
  // `sizeFor` já calcula a largura que a seção precisa; publicá-la aqui tira a
  // adivinhação do navegador e deixa o desenho e a contauguados pela mesma
  // fórmula.
  const [sectionBoxWidths, setSectionBoxWidths] = useState<Partial<Record<ToolbarSectionKey, number>>>({});
  const [hoveredSection, setHoveredSection] = useState<ToolbarSectionKey | null>(null);
  const [pinnedSection, setPinnedSection] = useState<ToolbarSectionKey | null>(null);
  const [compactHorizontal, setCompactHorizontal] = useState(false);
  const [repulsionGapPx, setRepulsionGapPx] = useState<number | null>(null);
  const [, setOverflowLayoutTick] = useState(0);
  const openSection = pinnedSection ?? hoveredSection;

  const effectiveShowSectionLabels = showToolbarSectionLabels && !( true && compactHorizontal );
  const toolIcon = (Icon: typeof FolderOpen, size = 13, className = "") => (
    <DualToneIcon icon={Icon} size={size} className={className} />
  );

  const formatShortcutCompact = (shortcut: string) =>
    shortcut
      .replace(/Ctrl/gi, "^")
      .replace(/Shift/gi, "⇧")
      .replace(/Alt/gi, "⌥")
      .replace(/Meta/gi, "⌘")
      .replace(/\+/g, "");

  // `no-drag` **incondicional**, e o motivo é a correção do arrasto.
  //
  // Antes era `canControlWindow ? {...} : undefined` — fora do Tauri o botão
  // ficava **sem** `no-drag` e herdava `drag` da barra. No Tauri isso não
  // importava (o wrapper acima era `no-drag` e segurava tudo); mas com o
  // wrapper corrigido, o botão passaria a herdar `drag` **também no Tauri** e a
  // disputa entre clique e gesto voltaria — que é exatamente o defeito que o
  // `no-drag` no contêiner escondia.
  //
  // Declarar sempre deixa o DOM honesto: `getComputedStyle` responde a
  // intenção, no navegador como no Tauri — foi assim que a área sem gesto foi
  // medida. `MenuBar` e `WindowTitleBar` já eram incondicionais; a barra era a
  // única com a porta entreaberta. Fora do Tauri `-webkit-app-region` é
  // inerte, então não custa.
  const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!pinnedSection) return;
      const target = event.target as Node | null;
      const insideTrigger = pinnedSection
        ? overflowTriggerRefs.current[pinnedSection]?.contains(target ?? null)
        : false;
      const insidePanel = pinnedSection
        ? overflowPanelRefs.current[pinnedSection]?.contains(target ?? null)
        : false;
      if (!insideTrigger && !insidePanel) {
        setPinnedSection(null);
        setHoveredSection(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinnedSection(null);
        setHoveredSection(null);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pinnedSection]);

  const openOverflow = (sectionKey: ToolbarSectionKey) => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    if (!pinnedSection || pinnedSection === sectionKey) {
      setHoveredSection(sectionKey);
    }
    setOverflowLayoutTick((previous) => previous + 1);
  };

  const closeOverflowSoon = (sectionKey: ToolbarSectionKey) => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    if (pinnedSection === sectionKey) return;
    hoverCloseTimerRef.current = setTimeout(() => {
      setHoveredSection((previous) => (previous === sectionKey ? null : previous));
    }, 140);
  };

  const getHorizontalOverflowMetrics = (sectionKey: ToolbarSectionKey) => {
if (typeof window === "undefined") {
      return { panelWidth: undefined };
    }

    const section = enabledSections.find((item) => item.key === sectionKey);
    const allActions = section?.actions ?? [];
    const visibleCount = visibleCounts[sectionKey] ?? allActions.length;
    const actions = allActions.slice(Math.max(0, Math.min(visibleCount, allActions.length)));
    const gap = 6;
    const paddingX = 16;
    const hiddenMeasureButtons = measureButtonRefs.current[sectionKey]?.slice(
      Math.max(0, Math.min(visibleCount, allActions.length))
    );
    const buttonWidths =
      hiddenMeasureButtons
        ?.map((button, index) => {
          const measured = Math.ceil(button?.getBoundingClientRect().width ?? 0);
          if (measured > 0) return measured + 8;
          const label = actions[index]?.label ?? "";
          return Math.max(72, label.length * 7.4 + 38);
        }) ?? actions.map((action) => Math.max(72, action.label.length * 7.4 + 38));
    const titleWidth = Math.ceil(sectionTitleRefs.current[sectionKey]?.getBoundingClientRect().width ?? 0);
    const actionsWidth =
      buttonWidths.reduce((sum, width) => sum + width, 0) +
      Math.max(0, buttonWidths.length - 1) * gap;
    const headerWidth = titleWidth + 56;
    const desiredWidth = Math.ceil(Math.max(actionsWidth + paddingX, headerWidth + paddingX, 132));
    const viewportWidth = Math.max(220, Math.floor(window.innerWidth - 16));

    return {
      panelWidth: Math.min(desiredWidth, viewportWidth),
    };
  };

  const getOverflowPanelStyle = (sectionKey: ToolbarSectionKey): React.CSSProperties => {
    const frame = sectionFrameRefs.current[sectionKey];
    const trigger = overflowTriggerRefs.current[sectionKey];
    if ((!frame && !trigger) || typeof window === "undefined") return {};
    const anchorRect = (trigger ?? frame)!.getBoundingClientRect();
    const frameRect = (frame ?? trigger)!.getBoundingClientRect();
    const rect = true ? frameRect : anchorRect;
    const gap = 6;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const panelEl = overflowPanelRefs.current[sectionKey];
    const horizontalOverflow = getHorizontalOverflowMetrics(sectionKey);
    const estimatedPanelWidth = Math.min(
      Math.max(
        horizontalOverflow.panelWidth ?? panelEl?.offsetWidth ?? 420,
        240
      ),
      Math.floor(window.innerWidth - 24)
    );
    // `clampedTop` saiu: era o `rect.top - 8` do ramo vertical, e o ramo de cima
    // precisa abrir **abaixo** da barra. `estimatedPanelHeight` continua, agora
    // como teto do popover.
    const estimatedPanelHeight = Math.min(
      Math.max(panelEl?.offsetHeight ?? 320, 180),
      Math.floor(window.innerHeight * 0.7)
    );
    const centeredLeft = clamp(
      Math.round(frameRect.left + frameRect.width / 2 - estimatedPanelWidth / 2),
      8,
      Math.max(8, window.innerWidth - estimatedPanelWidth - 8)
    );
    const anchorX = clamp(
      Math.round(anchorRect.left + anchorRect.width / 2 - centeredLeft),
      22,
      Math.max(22, estimatedPanelWidth - 22)
    );

    if (floatingToolbarAnchor === "bottom") {
      return {
        position: "fixed",
        bottom: window.innerHeight - rect.top + gap,
        left: centeredLeft,
        width: estimatedPanelWidth,
        ["--ml-popover-anchor-x" as string]: `${anchorX}px`,
      };
    }

    // O ramo de cima abre **abaixo** da barra (`rect.bottom + gap`).
    // `clampedTop` (o `rect.top - 8` que sobra do ramo vertical) abria por
    // cima e, com a barra integrada na linha do header, o popover cobria os
    // próprios botões que o abriram — e o `hover` seguinte do `test:ui-layout`
    // batia num elemento bloqueado. Medido: painel `t=8..93` cobrindo botões
    // em `y=0`.
    //
    // O piso de 8px e o teto de `estimatedPanelHeight` mantêm o painel inteiro
    // dentro da janela.
    const top = clamp(
      rect.bottom + gap,
      8,
      Math.max(8, window.innerHeight - estimatedPanelHeight - 8)
    );
    return {
      position: "fixed",
      top,
      left: centeredLeft,
      width: estimatedPanelWidth,
      ["--ml-popover-anchor-x" as string]: `${anchorX}px`,
    };
  };

  const sections = useMemo<ToolbarSectionModel[]>(
    () => [
      {
        key: "files",
        title: t["toolbar.files"] || "Files",
        icon: toolIcon(FolderOpen, 11),
        actions: [
          toolbarItems.fileNew
            ? { id: "file-new", label: t["file.new"] || "New", icon: toolIcon(FilePlus2), onClick: onNewFile, shortcutId: "file-new" }
            : null,

          toolbarItems.fileOpen
            ? { id: "file-open", label: t["file.open"] || "Open", icon: toolIcon(FileInput), onClick: onOpenFile, shortcutId: "file-open" }
            : null,
          toolbarItems.fileOpenFolder
            ? {
              id: "file-open-folder",
              label: t["file.openFolder"] || "Open folder",
              icon: toolIcon(FolderOpen),
              onClick: onOpenFolder,
              shortcutId: "file-open-folder",
            }
            : null,
          toolbarItems.fileSave
            ? { id: "file-save", label: t["file.save"] || "Save", icon: toolIcon(Save), onClick: onSave, shortcutId: "file-save" }
            : null,
          toolbarItems.fileExport
            ? { id: "file-export", label: t["file.export"] || "Export", icon: toolIcon(Download), onClick: onExport, shortcutId: "file-export" }
            : null,
        ].filter(Boolean) as ToolbarAction[],
      },
      {
        key: "editing",
        title: t["toolbar.editing"] || "Editing",
        icon: toolIcon(PenLine, 11),
        actions: [
          toolbarItems.editBold
            ? {
              id: "edit-bold",
              label: t["tool.bold"] || "Bold",
              icon: toolIcon(Bold),
              onClick: () => onFormatAction("bold"),
              shortcutId: "fmt-bold",
            }
            : null,
          toolbarItems.editItalic
            ? {
              id: "edit-italic",
              label: t["tool.italic"] || "Italic",
              icon: toolIcon(Italic),
              onClick: () => onFormatAction("italic"),
              shortcutId: "fmt-italic",
            }
            : null,
          toolbarItems.editCode
            ? {
              id: "edit-code",
              label: t["tool.code"] || "Code",
              icon: toolIcon(Code),
              onClick: () => onFormatAction("code"),
            }
            : null,
          toolbarItems.editLink
            ? {
              id: "edit-link",
              label: t["tool.link"] || "Link",
              icon: toolIcon(Link2),
              onClick: () => onFormatAction("link"),
              shortcutId: "fmt-link",
            }
            : null,
          toolbarItems.editImage
            ? {
              id: "edit-image",
              label: t["tool.image"] || "Image",
              icon: toolIcon(Image),
              onClick: () => onFormatAction("image"),
            }
            : null,
          toolbarItems.editTable
            ? {
              id: "edit-table",
              label: "Table",
              icon: toolIcon(Table),
              onClick: () => onFormatAction("table"),
            }
            : null,
          // Numerada, com pontos e de tarefa saíram de três botões e viraram
          // **um**: `ToolbarDropdown`, marcado como `id: "edit-lists"`. Três
          // botões de 32px para três variações do mesmo verbo é a definição de
          // botão repetido — e numa janela estreita eles eram os primeiros a
          // cair no `+N`, justamente os três que se usam mais.
          //
          // `shortcutId` continua em cada item interno: quem sabe `Ctrl+Shift+7`
          // não deveria passar pelo dropdown para chegar lá.
          toolbarItems.editUL || toolbarItems.editOL || toolbarItems.editTask
            ? {
              id: "edit-lists",
              label: t["tool.lists"] || "Lists",
              icon: toolIcon(List),
              dropdownItems: [
                ...(toolbarItems.editOL
                  ? [{ id: "list-ol", label: t["tool.ol"] || "Numbered", icon: toolIcon(ListOrdered, 13, "ml-toolbar-icon"), onSelect: () => onFormatAction("ol"), shortcut: shortcutLabels["fmt-ol"] }]
                  : []),
                ...(toolbarItems.editUL
                  ? [{ id: "list-ul", label: t["tool.ul"] || "Bulleted", icon: toolIcon(List, 13, "ml-toolbar-icon"), onSelect: () => onFormatAction("ul"), shortcut: shortcutLabels["fmt-ul"] }]
                  : []),
                ...(toolbarItems.editTask
                  ? [{ id: "list-task", label: t["tool.task"] || "Task", icon: toolIcon(CheckSquare, 13, "ml-toolbar-icon"), onSelect: () => onFormatAction("task"), shortcut: shortcutLabels["fmt-task"] }]
                  : []),
              ],
            }
            : null,
          // `snippets`, `format` e `minify` saíram da faixa: os três têm item
          // no menu Ações agora (PR #187), e um controle que existe na faixa e
          // no menu com o mesmo nome é o mesmo rótulo duas vezes na mesma tela —
          // e uma das duas traduções erra por definição.
          // As chaves `sysSnippets`/`sysFormatMarkdown`/`sysMinifyMarkdown`
          // continuam em `AppSettings`: quem tem a faixa salva num perfil antigo
          // ainda manda o dado, e descartar dado guardado é um apagão que ninguém
          // pediu.
        ].filter(Boolean) as ToolbarAction[],
      },
      // A seção "Sistema" reunia quatro naturezas diferentes — inserção
      // (`snippets`, `format-markdown`, `minify-markdown`), aparência (`theme`),
      // layout (`sidebar`, `edit`, `split`, `preview`, `zen`) e app (`settings`) —
      // e nenhuma seção tem propósito quando não é uma coisa só. Agora:
// Visualização leva o layout, Edição leva as ferramentas de Markdown, e Sistema
      // fica com o que é do sistema: tema e configurações.
      {
        key: "view",
        title: t["toolbar.view"] || "View",
        icon: toolIcon(PanelLeft, 11),
        actions: [
          toolbarItems.sysSidebar
            ? {
              id: "sys-sidebar",
              label: t["view.sidebar"] || "Sidebar",
              icon: toolIcon(PanelLeft),
              onClick: onToggleSidebar,
              // Três estados: o botão fica "ativo" nas duas posições visíveis —
              // colapsado continua sendo o sidebar mostrado. Sem isto o item
              // apagava ao colapsar, que é o oposto do que aconteceu.
              active: sidebarEnabled,
              shortcutId: "view-sidebar",
            }
            : null,
          toolbarItems.sysEdit
            ? {
              id: "sys-edit",
              label: t["view.editor"] || "Edit",
              icon: toolIcon(PenLine),
              onClick: () => onViewModeChange("edit"),
              active: viewMode === "edit",
              shortcutId: "view-edit",
            }
            : null,
          toolbarItems.sysSplit
            ? {
              id: "sys-split",
              label: t["view.split"] || "Split",
              icon: toolIcon(Columns2),
              onClick: () => onViewModeChange("split"),
              active: viewMode === "split",
              shortcutId: "view-split",
            }
            : null,
          toolbarItems.sysPreview
            ? {
              id: "sys-preview",
              label: t["view.preview"] || "Preview",
              icon: toolIcon(Eye),
              onClick: () => onViewModeChange("preview"),
              active: viewMode === "preview",
              shortcutId: "view-preview",
            }
            : null,
          toolbarItems.sysZen
            ? {
              id: "sys-zen",
              label: t["view.zen"] || "Zen",
              icon: toolIcon(Focus),
              onClick: onToggleZen,
              shortcutId: "view-zen",
            }
            : null,
        ].filter(Boolean) as ToolbarAction[],
      },
      {
        key: "system",
        title: t["toolbar.system"] || "System",
        icon: toolIcon(Settings2, 11),
        actions: [
          toolbarItems.sysTheme
            ? {
              id: "sys-theme",
              label: t["toolbar.theme"] || "Theme",
              icon: toolIcon(Palette),
              onClick: onCycleTheme,
              shortcutId: "view-theme-cycle",
            }
            : null,
          {
            id: "sys-settings",
            label: t["settings"] || "Settings",
            icon: toolIcon(Settings2),
            onClick: onOpenSettings,
            shortcutId: "app-settings",
          },
        ].filter(Boolean) as ToolbarAction[],
      },
    ],
    [
      onCycleTheme,
      onExport,
      onFormatAction,
      onNewFile,
      onOpenFile,
      onOpenFolder,
      onOpenSettings,
      onOpenSnippets,
      onSave,
      onToggleSidebar,
      onToggleZen,
      onViewModeChange,
      onTransformMarkdown,
      sidebarEnabled,
      t,
      toolbarItems,
      viewMode,
    ]
  );

  // Só a seção **editing** desenha. As outras três saíram com o desenho do
  // dono para o topo, e cada uma tem onde estar melhor:
  //
  // - `files` (novo, abrir, salvar, exportar) — na linha 2, no cabeçalho da
  //   lateral, e no menu Arquivo. Na faixa de formatação um botão "Salvar"
  //   entre "Negrito" e "Itálico" mente sobre a própria vizinhança.
  // - `view` (layout, tema, configurações) — no menu Exibir. São estados da
  //   janela inteira, não do cursor no texto.
  // - `system` — idem, e sem substance própria desde que os itens migraram.
  //
  // A seção continua respeitando o próprio interruptor, para quem chegar de um
  // perfil salvo com a faixa desligada não ver a faixa que pediu para não ver.
  // As chaves seguem em `AppSettings.toolbarSections`: apagar dado guardado é
  // um apagão que ninguém pediu.
  const enabledSections = useMemo(
    () => sections.filter((section) => section.key === "editing" && toolbarSections[section.key]),
    [sections, toolbarSections]
  );

  // `hiddenSections` saiu com o item "restaurar seção" do layout vertical: ele
  // não tinha consumidor desde que as âncoras `left`/`right` saíram.
  const setMeasureButtonRef = (sectionKey: ToolbarSectionKey, index: number, el: HTMLButtonElement | null) => {
    if (!measureButtonRefs.current[sectionKey]) {
      measureButtonRefs.current[sectionKey] = [];
    }
    measureButtonRefs.current[sectionKey]![index] = el;
  };

  const recomputeVisibleCounts = useCallback(() => {
    if (!centerRef.current) return;

    const sectionGap = 14;
    const itemGap = 4;
    // Vertical overflow badge uses the same h-8 button as regular actions.
    const badgeSize = 28;
    const currentWidth = centerRef.current.clientWidth;
    const nextCompactHorizontal = true && currentWidth < toolbarCompactBreakpoint;
    setCompactHorizontal((previous) => (previous === nextCompactHorizontal ? previous : nextCompactHorizontal));
    const available = Math.max(
      0,
      (centerRef.current.clientWidth) -
      Math.max(0, enabledSections.length - 1) * sectionGap -
      8
    );

    const sectionMeta = enabledSections.map((section) => {
      const titleNode = sectionTitleRefs.current[section.key];
      const titleSize = Math.ceil(titleNode?.getBoundingClientRect().width ?? 0);
      const baseSize = (effectiveShowSectionLabels ? titleSize + 32 : 16);
      const actionSizes = section.actions.map((_, index) => {
        const node = measureButtonRefs.current[section.key]?.[index];
        if (node) {
          const rect = node.getBoundingClientRect();
          return Math.ceil(rect.width);
        }
        return (showLabel ? 86 : 32);
      });
      return {
        key: section.key,
        total: section.actions.length,
        baseSize,
        actionSizes,
      };
    });

    const sizeFor = (meta: (typeof sectionMeta)[number], count: number) => {
      const visible = Math.min(count, meta.total);
      const visibleSize = meta.actionSizes
        .slice(0, visible)
        .reduce((sum, size) => sum + size, 0);
      const visibleGaps = Math.max(0, visible - 1) * itemGap;
      const needsBadge = visible < meta.total;
      const badgePart = needsBadge ? (visible > 0 ? itemGap : 0) + badgeSize : 0;
      return meta.baseSize + visibleSize + visibleGaps + badgePart;
    };

    const next: Partial<Record<ToolbarSectionKey, number>> = {};
    let nextRepulsionGap: number | null = null;

    // Só existe o caminho horizontal: o ramo vertical foi removido junto com as
    // âncoras `left`/`right`. A distribuição de espaço entre seções por
    // "repulsion" (encolher o que mais devolve, crescer o que tem mais
    // pendente) é a lógica que sobrou.
    {
      const counts = sectionMeta.map((meta) => (meta.total > 0 ? 1 : 0));
      let used = sectionMeta.reduce((sum, meta, index) => sum + sizeFor(meta, counts[index]), 0);

      while (used > available) {
        const shrinkCandidates = sectionMeta
          .map((meta, index) => {
            if (counts[index] <= 0) return null;
            const nextCount = counts[index] - 1;
            const reclaim = sizeFor(meta, counts[index]) - sizeFor(meta, nextCount);
            return { index, reclaim };
          })
          .filter(Boolean) as Array<{ index: number; reclaim: number }>;

        if (shrinkCandidates.length === 0) break;
        shrinkCandidates.sort((a, b) => b.reclaim - a.reclaim || b.index - a.index);
        const target = shrinkCandidates[0];
        counts[target.index] -= 1;
        used -= target.reclaim;
      }

      let guard = 128;
      while (guard > 0) {
        guard -= 1;
        const growCandidates = sectionMeta
          .map((meta, index) => {
            if (counts[index] >= meta.total) return null;
            const cost = sizeFor(meta, counts[index] + 1) - sizeFor(meta, counts[index]);
            return {
              index,
              cost,
              remaining: meta.total - counts[index],
            };
          })
          .filter((candidate): candidate is { index: number; cost: number; remaining: number } =>
            Boolean(candidate && used + candidate.cost <= available)
          )
          .sort((a, b) => b.remaining - a.remaining || a.cost - b.cost || a.index - b.index);

        if (growCandidates.length === 0) break;
        const target = growCandidates[0];
        counts[target.index] += 1;
        used += target.cost;
      }

      for (const [index, meta] of sectionMeta.entries()) {
        next[meta.key] = counts[index];
      }
    }

    if (
      true &&
      typeof window !== "undefined" &&
      toolbarSectionBehavior === "repulsion" &&
      !nextCompactHorizontal &&
      enabledSections.length > 1
    ) {
      const sectionsCollapsed = sectionMeta.some((meta) => (next[meta.key] ?? meta.total) < meta.total);
      if (!sectionsCollapsed) {
        const sectionWidths = enabledSections.map((section) =>
          Math.ceil(sectionFrameRefs.current[section.key]?.getBoundingClientRect().width ?? 0)
        );
        const hasAllWidths = sectionWidths.every((width) => width > 0);
        if (hasAllWidths) {
          const totalSectionsWidth = sectionWidths.reduce((sum, width) => sum + width, 0);
          const defaultGapPx = Math.max(5, Math.min(window.innerWidth * 0.007, 13));
          const equalGap = (currentWidth - totalSectionsWidth) / (enabledSections.length - 1);
          if (Number.isFinite(equalGap) && equalGap > defaultGapPx) {
            nextRepulsionGap = Math.round(equalGap * 10) / 10;
          }
        }
      }
    }

    // A largura que a seção precisa, pela mesma fórmula que decidiu o overflow.
    // `sizeFor` já soma base, tamanhos medidos, gaps e o badge; faltam o
    // `px-1.5` do wrapper e a borda de 1px de cada lado.
    const nextBoxWidths: Partial<Record<ToolbarSectionKey, number>> = {};
    for (const meta of sectionMeta) {
      const count = next[meta.key] ?? 0;
      nextBoxWidths[meta.key] = Math.ceil(sizeFor(meta, count)) + 12 + 2;
    }
    setSectionBoxWidths((previous) => {
      const changed = sectionMeta.some((meta) => previous[meta.key] !== nextBoxWidths[meta.key]);
      return changed ? nextBoxWidths : previous;
    });

    setVisibleCounts((previous) => {
      const changed = enabledSections.some((section) => previous[section.key] !== next[section.key]);
      return changed ? next : previous;
    });
    setRepulsionGapPx((previous) => (previous === nextRepulsionGap ? previous : nextRepulsionGap));
  }, [effectiveShowSectionLabels, enabledSections, showLabel, toolbarCompactBreakpoint, toolbarSectionBehavior]);

  useEffect(() => {
    const raf = requestAnimationFrame(recomputeVisibleCounts);
    return () => cancelAnimationFrame(raf);
  }, [recomputeVisibleCounts]);

  useEffect(() => {
    const onResize = () => recomputeVisibleCounts();
    window.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => recomputeVisibleCounts());
      if (centerRef.current) observer.observe(centerRef.current);
      for (const section of enabledSections) {
        const frame = sectionFrameRefs.current[section.key];
        if (frame) observer.observe(frame);
      }
    }

    // **Carregar a fonte não dispara `resize`.** A primeira medição roda com a
    // fonte de fallback, mede larguras que não são as do desenho final e nunca
    // corrige: as seções ficam mais largas que o container e são cortadas pelo
    // `overflow-hidden` do pai. Medido — as seções ocupavam 1337px dentro de
    // 771px, e só 2 ícones apareciam. `fonts.ready` é o evento desse caso.
    let cancelled = false;
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        if (!cancelled) recomputeVisibleCounts();
      }).catch(() => {
        /* `fonts.ready` não rejeita em navegadores atuais; se rejeitar, a
           medição inicial continua valendo e o `resize` corrige depois. */
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [enabledSections, recomputeVisibleCounts]);

  /**
   * A classe do botão na barra. **Uma função só**, porque o container de medição
   * precisa exatamente desta: ele media `h-8 px-2.5 … gap-1.5` (o layout antigo,
   * ícone ao lado do texto) enquanto o botão real é `w-8 p-0`. Medir um desenho e
   * desenhar outro faz a barra esconder ações que cabem — medido: 617px
   * disponíveis, 32px por ação, e mesmo assim só 10 das 23 apareciam.
   */
  const toolbarButtonClass = (action: ToolbarAction) =>
    empilhado
      // Rótulo abaixo: a largura passa a depender do **nome**, não do par
      // ícone+texto, e a altura da barra sobe para 44px (token). O `w-14`
      // trava o nome em uma linha para a medição não oscilar por conteúdo.
      ? `h-11 w-14 shrink-0 px-1 relative inline-flex flex-col items-center justify-center gap-0.5 rounded-md font-medium transition-colors ml-btn ${action.active ? "ml-btn-active" : ""} ${action.disabled ? "opacity-40 pointer-events-none" : ""}`
      // Só o ícone: um quadrado. De 118px medidos para 32px, e é o que
      // finalmente deixa as ações caberem sem transbordo.
      : `h-8 w-8 shrink-0 p-0 relative inline-flex items-center justify-center rounded-md font-medium transition-colors ml-btn ${action.active ? "ml-btn-active" : ""} ${action.disabled ? "opacity-40 pointer-events-none" : ""}`;

  const renderActionButton = (action: ToolbarAction, variant: "toolbar" | "popover" = "toolbar") => {
    const shortcutText = action.shortcutId ? shortcutLabels[action.shortcutId] : undefined;
    const buttonClass =
      variant === "popover"
        ? `${"h-9 min-w-[72px] max-w-full flex-none px-3 justify-start"} inline-flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--ml-fg,#111827)_6%,transparent)] text-[12px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--ml-fg,#111827)_10%,transparent)] ${action.active ? "ml-btn-active" : ""} ${action.disabled ? "opacity-40 pointer-events-none" : ""}`
        : toolbarButtonClass(action);
    // Ação com `dropdownItems` **não** é um botão: é o gatilho de um menu. A
    // distinção fica aqui, num lugar só, para que toda ação da faixa continue
    // passando por `renderActionButton` — inclusive a medição de largura, que
    // depende do elemento renderizado e não de um caso especial.
    if (action.dropdownItems) {
      return (
        <ToolbarDropdown
          key={action.id}
          label={action.label}
          icon={action.icon}
          items={action.dropdownItems}
          showLabel={showLabel && variant === "popover"}
          className={empilhado ? "h-auto w-auto px-2" : ""}
        />
      );
    }
    return (
      <button
        key={action.id}
        className={buttonClass}
        onClick={(event) => {
          event.stopPropagation();
          if (!action.disabled) action.onClick();
        }}
        title={shortcutText ? `${action.label} (${shortcutText})` : action.label}
        type="button"
        // Em `icon_only` o botão não tem texto visível, então o `title` (que é o
        // tooltip) é a única pista no mouse — e nada para um leitor de tela. O
        // `aria-label` é o que mantém o nome acessível; o `title` fica por causa
        // do tooltip e do atalho.
        aria-label={shortcutText ? `${action.label} (${shortcutText})` : action.label}
        style={noDragStyle}
      >
        {showIcon && action.icon}
        {showLabel && (
          <span
            className={
              variant === "popover"
                ? "min-w-0 truncate whitespace-nowrap"
                : empilhado
                  ? "max-w-full truncate text-[10px] leading-none font-medium"
                  : "max-w-[142px] truncate whitespace-nowrap"
            }
          >
            {action.label}
          </span>
        )}
        {variant === "toolbar" && showShortcutHints && shortcutText && (
          <span className="ml-toolbar-shortcut-tooltip" role="tooltip">
            {action.label}
            <span>{compactHorizontal ? formatShortcutCompact(shortcutText) : shortcutText}</span>
          </span>
        )}
      </button>
    );
  };

  const renderSection = (section: ToolbarSectionModel) => {
    const visibleCount = visibleCounts[section.key] ?? section.actions.length;
    const clampedVisibleCount = Math.max(0, Math.min(visibleCount, section.actions.length));
    const collapsed = clampedVisibleCount < section.actions.length;
    const visibleActions = collapsed ? section.actions.slice(0, clampedVisibleCount) : section.actions;
    const overflowActions = collapsed ? section.actions.slice(clampedVisibleCount) : [];

// Comentário de uma seção, sobre o que o desenho abaixo faz e por quê.
    //
    // A largura da seção vem do cálculo de overflow (`sectionBoxWidths`), e isso
    // não é acaso. Sem largura explícita o navegador tenta resolver a largura
    // intrínseca e **não fecha o ciclo** quando a seção tem um único filho em bloco
    // de largura automática — que é o caso desde que a etiqueta de grupo está
    // desligada por padrão. Medido: `max-content` resolvia 1337px e `fit-content`
    // 771px, sempre idênticos, e remover qualquer um dos 73 descendentes não mudava
    // nada: a largura não vinha do conteúdo. Com `flex-shrink: 0` as quatro seções
    // estouravam e as três últimas saíam da tela — 2 ícones visíveis em vez de 12.
    //
    // O mesmo vale para o container de medição: ele usa `toolbarButtonClass`, a
    // mesma função do botão real. Medir um desenho e desenhar outro já custou 23
    // ações — o botão real mede 32px e o de medição media ~36px.
    return (
      <div
        key={section.key}
        className="ml-toolbar-section relative rounded-[10px] flex-shrink-0 transition-colors mx-auto"
        ref={(el) => {
          sectionFrameRefs.current[section.key] = el;
        }}
        data-toolbar-open={openSection === section.key}
        style={
          sectionBoxWidths[section.key]
            ? { width: `${sectionBoxWidths[section.key]}px` }
            : undefined
        }
      >
        {true && (
          <div className="absolute left-0 top-0 -z-10 opacity-0 pointer-events-none whitespace-nowrap">
            {section.actions.map((action, index) => (
              <button
                key={`${action.id}-measure`}
                ref={(el) => setMeasureButtonRef(section.key, index, el)}
                type="button"
                className={toolbarButtonClass(action)}
              >
                {showIcon && action.icon}
                {showLabel && (
                  <span className={empilhado ? "max-w-full truncate text-[10px] leading-none font-medium" : "max-w-[142px] truncate whitespace-nowrap"}>
                    {action.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className={`${`flex ${innerHeightClass} min-w-0 items-center gap-2 px-1.5 relative`}`}>
          {/* A etiqueta de grupo fica **sempre** no DOM, mesmo desligada — só
              com largura zero. Não é preciosismo: este div interno precisa de
              **dois** filhos em flex para que o `max-content` da seção seja
              determinado. Com um filho único de largura automática, a largura do
              filho depende da do pai e o navegador não fecha o ciclo: medido, a
              seção virava 1337px dentro de um centro de 771px e as seções 2–4
              saíam da tela, deixando 2 ícones visíveis. O `title` segue no
              elemento, então o nome da seção continua disponível para o reader. */}
          {/* O rótulo da categoria saiu **inteiro**, e não por configuração.

             A decisão é do dono: os controles de edição não precisam de título
             visível. Negrito, itálico, código, link, imagem e tabela se
             reconhecem pelo desenho; o nome da categoria consumia ~34px de uma
             faixa de 32px e disputava largura com o nome do produto.

             Antes havia um interruptor em Configurações que ligava e desligava
             isto. Tirar o rótulo e deixar o interruptor seria um interruptor que
             liga nada — a mesma classe de defeito do item que promete e não
             cumpre. Os dois saíram juntos.

             O div continua no DOM, com largura zero, e não pode sair: ver o
             comentário acima, ele é o que fecha o cálculo de `max-content`. O
             nome da seção continua no `title` dele, então segue disponível para o
             mouse — e o `aria-hidden` é o que impede o leitor de tela de ler um
             rótulo de largura zero.

             Este é um comentário **de JSX** (com as chaves) e não um bloco
             solto. Dentro do JSX, bloco solto vira texto renderizado, e foi
             exatamente o que aconteceu: ele apareceu na faixa, inteiro, **dentro
             da linha flex** cujo `max-content` o comentário acima descreve. Um
             parágrafo de texto nesse meio é pior que inútil — é o que a medição
             de 1337px existe para impedir. `tsc` e `build` passam verdes: texto
             é um nó válido, e só a captura pega. */}
          <div
            ref={(el) => {
              sectionTitleRefs.current[section.key] = el;
            }}
            title={section.title}
            aria-hidden
            className="ml-toolbar-section-title w-0 px-0 h-8 shrink-0 inline-flex items-center overflow-hidden"
          >
            {section.title}
          </div>

          <div className={`${"flex items-center gap-1"}`}>
            {visibleActions.map((action) => renderActionButton(action))}
            {collapsed && (
              <button
                type="button"
                className={`${"inline-flex h-8 items-center rounded-md px-1.5"} text-[10px] font-medium ml-btn`}
                ref={(el) => {
                  overflowTriggerRefs.current[section.key] = el;
                }}
                onMouseEnter={() => openOverflow(section.key)}
                onMouseLeave={() => closeOverflowSoon(section.key)}
                onFocus={() => openOverflow(section.key)}
                onBlur={() => closeOverflowSoon(section.key)}
                onClick={(event) => {
                  event.stopPropagation();
                  setPinnedSection((previous) => (previous === section.key ? null : section.key));
                  setHoveredSection(section.key);
                }}
                aria-label={`${section.title} hidden actions`}
                aria-expanded={openSection === section.key}
                style={noDragStyle}
                data-overflow-trigger={section.key}
              >
                +{section.actions.length - clampedVisibleCount}
              </button>
            )}
          </div>
        </div>

        {collapsed && openSection === section.key && (
          <div
            className={`ml-toolbar-popover fixed z-[260] max-h-[70vh] max-w-[calc(100vw-16px)] overflow-y-auto rounded-[14px] border p-2 shadow-[0_14px_34px_rgba(2,6,23,0.14)] ${"w-fit"} ${tConfig.uiBorder}`}
            ref={(el) => {
              overflowPanelRefs.current[section.key] = el;
              if (el) {
                requestAnimationFrame(() => {
                  setOverflowLayoutTick((previous) => previous + 1);
                });
              }
            }}
            style={{ ...getOverflowPanelStyle(section.key), ...noDragStyle }}
            onMouseEnter={() => openOverflow(section.key)}
            onMouseLeave={() => closeOverflowSoon(section.key)}
            data-overflow-panel={section.key}
            data-anchor-edge={true ? (floatingToolbarAnchor === "bottom" ? "bottom" : "top") : undefined}
          >
            {true && <div className="ml-toolbar-popover__anchor" aria-hidden="true" />}
            <div className={`mb-2 flex items-center justify-between gap-3 px-1 ${"pt-0.5"}`}>
              <div className={`ml-toolbar-section-title inline-flex items-center ${""}`}>
                {section.title}
              </div>
              {true && (
                <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] opacity-55">
                  {overflowActions.length} acoes
                </span>
              )}
            </div>
            <div
              className={
    "flex max-w-full flex-wrap items-center gap-1.5"
              }
            >
              {overflowActions.map((action) => renderActionButton(action, "popover"))}
            </div>
          </div>
        )}
      </div>
    );
  };




  // `left`/`right` saíram do enumérico de `floatingToolbarAnchor`
  // — eram barras verticais fixas, e nenhuma das quatro regiões da spec descreve
  // essa área. `integrated` usa o mesmo layout horizontal de antes, agora dentro
  // da linha do header.
  //
  // `w-full min-w-0` é o que **medido** exigiu: sem ele a raiz fica com
  // `flex: 0 1 auto`, encolhe para 158px e espreme os 27 botões, mesmo com o
  // pai (`flex-1`) oferecendo 674px.
  // `border-b` só na âncora `bottom`. Integrada na linha do header, a barra
  // somava a própria borda aos 32px do header e ficava com 33px — que o
  // `align-items: center` centralizava em `top: -1`, tirando o botão de
  // overflow da área visível. O header já tem a sua própria borda.
  const positionClass =
    floatingToolbarAnchor === "bottom"
      ? `relative z-[120] w-full min-w-0 border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)] overflow-visible ${tConfig.uiBorder} ${tConfig.ui}`
      : `relative z-[120] w-full min-w-0 overflow-visible ${tConfig.uiBorder} ${tConfig.ui}`;

  const rootStyle: React.CSSProperties = {
    fontFamily: tConfig.uiFont,
  };
  const sectionsAreCollapsed = enabledSections.some(
    (section) => (visibleCounts[section.key] ?? section.actions.length) < section.actions.length
  );
  const useRepulsionLayout =
    true &&
    toolbarSectionBehavior === "repulsion" &&
    !compactHorizontal &&
    enabledSections.length > 1 &&
    !sectionsAreCollapsed &&
    repulsionGapPx !== null;

  // A barra **inteira** é horizontal. O vertical saiu com as âncoras
  // `left`/`right`, e o ternário que restou dessa migração saiu junto.
  //
  // E `flex-1 min-w-0` no wrapper horizontal dá à barra a largura que o header
  // lhe oferece: sem ele o filho encolhe para o conteúdo (`flex: 0 1 auto`) e os
  // 27 botões ficam espremidos em 158px — medido no DOM, não suposto.
  // A altura dos wrappers internos acompanha a âncora. Integrada na
  // Na âncora `bottom` a barra tem 36px. Integrada na linha do header (32px), a
  // barra precisa de 32px — os `h-9` (36px) de antes centralizavam o botão de
  // overflow em `y: -1`, e o Playwright nunca o considerava visível.
  // Com rótulo embaixo (`stacked`) são 44px em qualquer âncora, e o header do
  // App cresce junto pelo mesmo token — um `h-8` fixo lá cortaria o rótulo.
  const innerHeightClass = empilhado
    ? "!h-11"
    : floatingToolbarAnchor === "bottom"
      ? "h-9"
      : "h-8";

  return (
    <div
      className={`${positionClass} ${tConfig.fg}`}
      // A barra vertical deixou de existir, então a raiz é sempre
      // transparente — o fundo é o do header, que já está atrás dela.
      // `data-anchor`: a ancora decide se o chip da secao pode ter borda em cima e
    // embaixo. Ver a regra em `index.css` — e o comentario la explica a aritmetica.
    data-anchor={floatingToolbarAnchor}
    style={{ ...rootStyle, WebkitAppRegion: "drag", backgroundColor: "transparent" } as React.CSSProperties}
    >
      {(
        // `h-8`, e não `h-11`. A linha do header tem 32px; uma barra de 44px
    // centralizada nela dá `top: -7`, e o botão de overflow vira `y: -1` — que
    // o Playwright nunca considera visível, então `hover` estourava 30s. Medido
    // nas 4 viewports do `test:ui-layout`. A barra de baixo não é afetada: ela
    // não divide altura com o header.
    <div className={`flex items-center px-2 flex-1 min-w-0 ${floatingToolbarAnchor === "bottom" ? "h-11" : "h-8"}`} style={{ WebkitAppRegion: "drag", backgroundColor: tConfig.uiHex } as React.CSSProperties}>
          {/* Com `integrated` a barra tem **32px**, a altura da linha do header.
            Os dois wrappers internos mediam 36px (`h-9`) e, centrados dentro de
            32px, punham o botão de overflow em `y: -1`. Por isso a altura aqui
            acompanha a âncora em vez de ser fixa. */}
          <div className={`min-w-0 flex-1 ${innerHeightClass}`} ref={centerRef}>
            {/* **Sem `no-drag` aqui — e este é o pixel que faltava.**
              Era o `no-drag` deste contêiner que tirava o gesto da janela dos
              vãos: com a faixa centralizada por `mx-auto`, sobram duas faixas
              livres (à esquerda e à direita da seção) que são a maior área sem
              botão da linha de topo — e nenhuma arrastava.
              Medido em 700px: a faixa centralizada por `mx-auto` deixa ~72px
              de vão livre entre o fim do menu e o primeiro ícone, e entre o
              último ícone e o switcher — todos com `no-drag` herdado deste
              contêiner.
              Os botões mantêm `no-drag` no próprio elemento (`renderActionButton`,
              o gatilho de overflow e `ToolbarDropdown`), que é onde ele pertence:
              impede o clique e o gesto de disputarem o mesmo pixel sem tirar o
              gesto do vão. */}
            <div
              // A centralização da faixa é feita pela **margem automática** dela
              // (`mx-auto`, no `renderSection`), e não por `justify-content` aqui.
              //
              // A primeira versão usou `justify-content: safe center`, que é a
              // resposta aparentemente óbvia — e não funciona neste projeto: o
              // Chrome 153 aceita o valor (computado = `safe center`), mas o
              // Tailwind **não gera regra nenhuma** para `justify-[safe_center]`,
              // então a classe ia para o DOM sem CSS e a barra continuava
              // alinhada à esquerda sem nenhum erro. Medido, não suposto.
              //
              // Margem automática resolve o mesmo problema pela via especificada:
              // em flexbox, `margin: auto` **nunca** gera transbordo — quando o
              // conteúdo não cabe, ela resolve para zero e a faixa encosta na
              // esquerda, com o `+N` à vista. É o `safe center` sem depender do
              // JIT.
              className={`flex items-center flex-nowrap w-full overflow-hidden justify-start ${innerHeightClass}`}
              style={{
                gap: useRepulsionLayout ? `${repulsionGapPx}px` : "clamp(0.3rem, 0.7vw, 0.8rem)",
                pointerEvents: "auto",
              }}
            >
              {enabledSections.map((section) => renderSection(section))}
            </div>
          </div>

          <div className="w-0 shrink-0 pointer-events-none"></div>


        </div>
      )}
      <div className="sr-only">{sidebarEnabled ? "sidebar-enabled" : "sidebar-disabled"}</div>
      <div className="sr-only">{viewMode}</div>
    </div>
  );
};

export default TopChrome;
