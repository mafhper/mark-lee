import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  CheckSquare,
  Code,
  Columns2,
  Download,
  Eye,
  FilePlus2,
  FolderOpen,
  Focus,
  Image,
  Link2,
  List,
  ListOrdered,
  Palette,
  PanelLeft,
  Save,
  Search,
  Settings2,
  Sparkles,
  PenLine,
} from "lucide-react";
import { AppSettings, ThemeConfig } from "../../types";
import { isTauriRuntime } from "../../services/runtime";

type ToolbarSectionKey = keyof AppSettings["toolbarSections"];
type ToolbarAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  shortcutId?: string;
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
  shortcutLabels: Record<string, string>;
  showShortcutHints: boolean;
  onToolbarSectionChange: (section: ToolbarSectionKey, enabled: boolean) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onSave: () => void;
  onExport: () => void;
  onFindReplace: () => void;
  onOpenSettings: () => void;
  onOpenSnippets: () => void;
  onCycleTheme: () => void;
  onToggleSidebar: () => void;
  onToggleZen: () => void;
  onViewModeChange: (mode: "edit" | "split" | "preview") => void;
  onFormatAction: (action: "bold" | "italic" | "code" | "link" | "image" | "ul" | "ol" | "task") => void;
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
  shortcutLabels,
  showShortcutHints,
  onToolbarSectionChange,
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onSave,
  onExport,
  onFindReplace,
  onOpenSettings,
  onOpenSnippets,
  onCycleTheme,
  onToggleSidebar,
  onToggleZen,
  onViewModeChange,
  onFormatAction,
}) => {
  const canControlWindow = isTauriRuntime();
  const isVertical = floatingToolbarAnchor === "left" || floatingToolbarAnchor === "right";
  const showIcon = isVertical || toolbarDisplayMode !== "text_only";
  const showLabel = !isVertical && toolbarDisplayMode !== "icon_only";

  const centerRef = useRef<HTMLDivElement | null>(null);
  const sectionFrameRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const overflowTriggerRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLButtonElement | null>>>({});
  const overflowPanelRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const sectionTitleRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const measureButtonRefs = useRef<Partial<Record<ToolbarSectionKey, Array<HTMLButtonElement | null>>>>({});
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleCounts, setVisibleCounts] = useState<Partial<Record<ToolbarSectionKey, number>>>({});
  const [hoveredSection, setHoveredSection] = useState<ToolbarSectionKey | null>(null);
  const [pinnedSection, setPinnedSection] = useState<ToolbarSectionKey | null>(null);
  const [compactHorizontal, setCompactHorizontal] = useState(false);
  const [, setOverflowLayoutTick] = useState(0);
  const openSection = pinnedSection ?? hoveredSection;

  const effectiveShowSectionLabels = showToolbarSectionLabels && !( !isVertical && compactHorizontal );

  const noDragStyle: React.CSSProperties | undefined = canControlWindow
    ? ({ WebkitAppRegion: "no-drag" } as React.CSSProperties)
    : undefined;

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

  const getOverflowPanelStyle = (sectionKey: ToolbarSectionKey, isLastSection: boolean): React.CSSProperties => {
    const frame = sectionFrameRefs.current[sectionKey];
    const trigger = overflowTriggerRefs.current[sectionKey];
    if ((!frame && !trigger) || typeof window === "undefined") return {};
    const rect = (trigger ?? frame)!.getBoundingClientRect();
    const gap = 8;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const panelEl = overflowPanelRefs.current[sectionKey];
    const estimatedPanelHeight = Math.min(
      Math.max(panelEl?.offsetHeight ?? 320, 180),
      Math.floor(window.innerHeight * 0.7)
    );
    const estimatedPanelWidth = Math.min(
      Math.max(panelEl?.offsetWidth ?? (isVertical ? 108 : 420), isVertical ? 108 : 240),
      Math.floor(window.innerWidth - 16)
    );
    const clampedTop = clamp(
      rect.top - 8,
      8,
      Math.max(8, window.innerHeight - estimatedPanelHeight - 8)
    );
    const clampedLeft = clamp(
      rect.left,
      8,
      Math.max(8, window.innerWidth - estimatedPanelWidth - 8)
    );
    const clampedRight = clamp(
      window.innerWidth - rect.right,
      8,
      Math.max(8, window.innerWidth - estimatedPanelWidth - 8)
    );

    if (isVertical) {
      if (floatingToolbarAnchor === "right") {
        return {
          position: "fixed",
          top: clampedTop,
          right: Math.max(8, window.innerWidth - rect.left + gap),
        };
      }
      return {
        position: "fixed",
        top: clampedTop,
        left: Math.max(8, rect.right + gap),
      };
    }

    if (floatingToolbarAnchor === "bottom") {
      if (isLastSection) {
        return {
          position: "fixed",
          bottom: window.innerHeight - rect.top + gap,
          right: clampedRight,
        };
      }
      return {
        position: "fixed",
        bottom: window.innerHeight - rect.top + gap,
        left: clampedLeft,
      };
    }

    if (isLastSection) {
      return {
        position: "fixed",
        top: rect.bottom + gap,
        right: clampedRight,
      };
    }
    return {
      position: "fixed",
      top: rect.bottom + gap,
      left: clampedLeft,
    };
  };

  const sections = useMemo<ToolbarSectionModel[]>(
    () => [
      {
        key: "files",
        title: t["toolbar.files"] || "Files",
        icon: <FolderOpen size={11} />,
        actions: [
          toolbarItems.fileNew
            ? { id: "file-new", label: t["file.new"] || "New", icon: <FilePlus2 size={13} />, onClick: onNewFile, shortcutId: "file-new" }
            : null,

          toolbarItems.fileOpen
            ? { id: "file-open", label: t["file.open"] || "Open", icon: <FolderOpen size={13} />, onClick: onOpenFile, shortcutId: "file-open" }
            : null,
          toolbarItems.fileOpenFolder
            ? {
              id: "file-open-folder",
              label: t["file.openFolder"] || "Open folder",
              icon: <FolderOpen size={13} />,
              onClick: onOpenFolder,
              shortcutId: "file-open-folder",
            }
            : null,
          toolbarItems.fileSave
            ? { id: "file-save", label: t["file.save"] || "Save", icon: <Save size={13} />, onClick: onSave, shortcutId: "file-save" }
            : null,
          toolbarItems.fileExport
            ? { id: "file-export", label: t["file.export"] || "Export", icon: <Download size={13} />, onClick: onExport, shortcutId: "file-export" }
            : null,
        ].filter(Boolean) as ToolbarAction[],
      },
      {
        key: "editing",
        title: t["toolbar.editing"] || "Editing",
        icon: <Bold size={11} />,
        actions: [
          toolbarItems.editBold
            ? {
              id: "edit-bold",
              label: t["tool.bold"] || "Bold",
              icon: <Bold size={13} />,
              onClick: () => onFormatAction("bold"),
              shortcutId: "fmt-bold",
            }
            : null,
          toolbarItems.editItalic
            ? {
              id: "edit-italic",
              label: t["tool.italic"] || "Italic",
              icon: <i className="text-xs">I</i>,
              onClick: () => onFormatAction("italic"),
              shortcutId: "fmt-italic",
            }
            : null,
          toolbarItems.editCode
            ? {
              id: "edit-code",
              label: t["tool.code"] || "Code",
              icon: <Code size={13} />,
              onClick: () => onFormatAction("code"),
            }
            : null,
          toolbarItems.editLink
            ? {
              id: "edit-link",
              label: t["tool.link"] || "Link",
              icon: <Link2 size={13} />,
              onClick: () => onFormatAction("link"),
              shortcutId: "fmt-link",
            }
            : null,
          toolbarItems.editImage
            ? {
              id: "edit-image",
              label: t["tool.image"] || "Image",
              icon: <Image size={13} />,
              onClick: () => onFormatAction("image"),
            }
            : null,
          toolbarItems.editUL
            ? {
              id: "edit-ul",
              label: t["tool.ul"] || "UL",
              icon: <List size={13} />,
              onClick: () => onFormatAction("ul"),
              shortcutId: "fmt-ul",
            }
            : null,
          toolbarItems.editOL
            ? {
              id: "edit-ol",
              label: t["tool.ol"] || "OL",
              icon: <ListOrdered size={13} />,
              onClick: () => onFormatAction("ol"),
              shortcutId: "fmt-ol",
            }
            : null,
          toolbarItems.editTask
            ? {
              id: "edit-task",
              label: t["tool.task"] || "Task",
              icon: <CheckSquare size={13} />,
              onClick: () => onFormatAction("task"),
              shortcutId: "fmt-task",
            }
            : null,
        ].filter(Boolean) as ToolbarAction[],
      },
      {
        key: "system",
        title: t["toolbar.system"] || "System",
        icon: <Settings2 size={11} />,
        actions: [
          toolbarItems.sysFind
            ? {
              id: "sys-find",
              label: t["edit.find"] || "Find",
              icon: <Search size={13} />,
              onClick: onFindReplace,
              shortcutId: "edit-find",
            }
            : null,
          toolbarItems.sysSnippets
            ? {
              id: "sys-snippets",
              label: t["edit.snippets"] || "Snippets",
              icon: <Sparkles size={13} />,
              onClick: onOpenSnippets,
              shortcutId: "edit-snippets",
            }
            : null,
          toolbarItems.sysTheme
            ? {
              id: "sys-theme",
              label: t["toolbar.theme"] || "Theme",
              icon: <Palette size={13} />,
              onClick: onCycleTheme,
              shortcutId: "view-theme-cycle",
            }
            : null,
          toolbarItems.sysSidebar
            ? {
              id: "sys-sidebar",
              label: t["view.sidebar"] || "Sidebar",
              icon: <PanelLeft size={13} />,
              onClick: onToggleSidebar,
              active: sidebarEnabled,
              shortcutId: "view-sidebar",
            }
            : null,
          toolbarItems.sysEdit
            ? {
              id: "sys-edit",
              label: t["view.editor"] || "Edit",
              icon: <PenLine size={13} />,
              onClick: () => onViewModeChange("edit"),
              active: viewMode === "edit",
              shortcutId: "view-edit",
            }
            : null,
          toolbarItems.sysSplit
            ? {
              id: "sys-split",
              label: t["view.split"] || "Split",
              icon: <Columns2 size={13} />,
              onClick: () => onViewModeChange("split"),
              active: viewMode === "split",
              shortcutId: "view-split",
            }
            : null,
          toolbarItems.sysPreview
            ? {
              id: "sys-preview",
              label: t["view.preview"] || "Preview",
              icon: <Eye size={13} />,
              onClick: () => onViewModeChange("preview"),
              active: viewMode === "preview",
              shortcutId: "view-preview",
            }
            : null,
          toolbarItems.sysZen
            ? {
              id: "sys-zen",
              label: t["view.zen"] || "Zen",
              icon: <Focus size={13} />,
              onClick: onToggleZen,
              shortcutId: "view-zen",
            }
            : null,
          {
            id: "sys-settings",
            label: t["settings"] || "Settings",
            icon: <Settings2 size={13} />,
            onClick: onOpenSettings,
            shortcutId: "app-settings",
          },
        ].filter(Boolean) as ToolbarAction[],
      },
    ],
    [
      onCycleTheme,
      onExport,
      onFindReplace,
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
      sidebarEnabled,
      t,
      toolbarItems,
      viewMode,
    ]
  );

  const enabledSections = useMemo(
    () => sections.filter((section) => toolbarSections[section.key]),
    [sections, toolbarSections]
  );
  const hiddenSections = useMemo(
    () => sections.filter((section) => !toolbarSections[section.key]),
    [sections, toolbarSections]
  );
  const shortcutOverlayItems = useMemo(
    () =>
      enabledSections
        .flatMap((section) =>
          section.actions
            .filter((action) => Boolean(action.shortcutId && shortcutLabels[action.shortcutId!]))
            .slice(0, 5)
            .map((action) => ({
              id: action.id,
              label: action.label,
              shortcut: shortcutLabels[action.shortcutId!],
            }))
        )
        .slice(0, 10),
    [enabledSections, shortcutLabels]
  );

  const setMeasureButtonRef = (sectionKey: ToolbarSectionKey, index: number, el: HTMLButtonElement | null) => {
    if (!measureButtonRefs.current[sectionKey]) {
      measureButtonRefs.current[sectionKey] = [];
    }
    measureButtonRefs.current[sectionKey]![index] = el;
  };

  const recomputeVisibleCounts = useCallback(() => {
    if (!centerRef.current) return;

    const sectionGap = isVertical ? 8 : 14;
    const itemGap = 4;
    // Vertical overflow badge uses the same h-8 button as regular actions.
    const badgeSize = isVertical ? 32 : 28;
    const currentWidth = centerRef.current.clientWidth;
    const nextCompactHorizontal = !isVertical && currentWidth < toolbarCompactBreakpoint;
    setCompactHorizontal((previous) => (previous === nextCompactHorizontal ? previous : nextCompactHorizontal));
    const available = Math.max(
      0,
      (isVertical ? centerRef.current.clientHeight : centerRef.current.clientWidth) -
      Math.max(0, enabledSections.length - 1) * sectionGap -
      8
    );

    const sectionMeta = enabledSections.map((section) => {
      const titleNode = sectionTitleRefs.current[section.key];
      const titleSize = isVertical
        ? 0
        : Math.ceil(titleNode?.getBoundingClientRect().width ?? 0);
      const baseSize = isVertical ? 12 : (effectiveShowSectionLabels ? titleSize + 32 : 16);
      const actionSizes = section.actions.map((_, index) => {
        const node = measureButtonRefs.current[section.key]?.[index];
        if (node) {
          const rect = node.getBoundingClientRect();
          return Math.ceil(isVertical ? rect.height : rect.width);
        }
        return isVertical ? 32 : (showLabel ? 86 : 32);
      });
      return {
        key: section.key,
        total: section.actions.length,
        baseSize,
        actionSizes,
      };
    });

    const maxActions = Math.max(0, ...sectionMeta.map((s) => s.total));
    let uniformCount = maxActions;

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

    const totalForCount = (count: number) =>
      sectionMeta.reduce((sum, meta) => sum + sizeFor(meta, count), 0);

    while (uniformCount > 0 && totalForCount(uniformCount) > available) {
      uniformCount -= 1;
    }

    const next: Partial<Record<ToolbarSectionKey, number>> = {};
    for (const meta of sectionMeta) {
      const visible = isVertical
        ? (meta.total > 0 ? Math.max(1, Math.min(meta.total, uniformCount)) : 0)
        : Math.min(meta.total, uniformCount);
      next[meta.key] = visible;
    }

    setVisibleCounts((previous) => {
      const changed = enabledSections.some((section) => previous[section.key] !== next[section.key]);
      return changed ? next : previous;
    });
  }, [effectiveShowSectionLabels, enabledSections, isVertical, showLabel, toolbarCompactBreakpoint]);

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

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [enabledSections, recomputeVisibleCounts]);

  const renderActionButton = (action: ToolbarAction) => {
    const shortcutText = action.shortcutId ? shortcutLabels[action.shortcutId] : undefined;
    const shouldShowShortcut = Boolean(showShortcutHints && shortcutText);
    return (
      <button
      key={action.id}
      className={`${isVertical ? "h-8 w-8 px-0 justify-center" : "h-8 px-2.5"} min-w-0 inline-flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors ml-btn ${action.active ? "ml-btn-active" : ""
        }`}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick();
      }}
      title={shortcutText ? `${action.label} (${shortcutText})` : action.label}
      type="button"
      style={noDragStyle}
    >
      {showIcon && action.icon}
      {showLabel && <span className="truncate">{action.label}</span>}
      {shouldShowShortcut && !isVertical && (
        <span className="ml-1 text-[10px] opacity-70 whitespace-nowrap">{shortcutText}</span>
      )}
    </button>
    );
  };

  const renderSection = (section: ToolbarSectionModel) => {
    const visibleCount = visibleCounts[section.key] ?? section.actions.length;
    const clampedVisibleCount = Math.max(0, Math.min(visibleCount, section.actions.length));
    const collapsed = clampedVisibleCount < section.actions.length;
    const visibleActions = collapsed ? section.actions.slice(0, clampedVisibleCount) : section.actions;

    const isLastSection = enabledSections[enabledSections.length - 1]?.key === section.key;

    return (
      <div
        key={section.key}
        className="relative rounded-[8px] flex-shrink-0 transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-within:bg-black/6 dark:focus-within:bg-white/12"
        ref={(el) => {
          sectionFrameRefs.current[section.key] = el;
        }}
      >
        {!isVertical && (
          <div className="absolute left-0 top-0 -z-10 opacity-0 pointer-events-none whitespace-nowrap">
            {section.actions.map((action, index) => (
              <button
                key={`${action.id}-measure`}
                ref={(el) => setMeasureButtonRef(section.key, index, el)}
                type="button"
                className={`${isVertical ? "h-8 w-8 px-0 justify-center" : "h-8 px-2.5"} inline-flex items-center gap-1.5 rounded-md text-xs font-medium`}
              >
                {showIcon && action.icon}
                {showLabel && <span>{action.label}</span>}
              </button>
            ))}
          </div>
        )}

        <div className={`${isVertical ? "flex flex-col items-center gap-1 p-1.5" : "flex h-9 min-w-0 items-center gap-2 px-1.5 relative"}`}>
          {!isVertical && effectiveShowSectionLabels && (
            <>
              <div
                ref={(el) => {
                  sectionTitleRefs.current[section.key] = el;
                }}
                className="h-8 shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide"
              >
                {section.icon}
                {section.title}
              </div>
              <div className="h-5 w-px bg-black/25 dark:bg-white/25 shrink-0" />
            </>
          )}

          <div className={`${isVertical ? "flex flex-col items-center gap-1" : "flex items-center gap-1"}`}>
            {visibleActions.map((action, index) => {
              // Group dividers for the "system" section
              const isSystem = section.key === "system";
              const renderDivider = isSystem && !isVertical && index > 0 && (
                (action.id === "sys-theme" && visibleActions[index - 1]?.id === "sys-snippets") ||
                (action.id === "sys-edit" && visibleActions[index - 1]?.id === "sys-sidebar") ||
                (action.id === "sys-settings" && visibleActions[index - 1]?.id === "sys-zen")
              );

              return (
                <React.Fragment key={action.id}>
                  {renderDivider && (
                    <div className="mx-1 h-4 w-px bg-current opacity-20 shrink-0" />
                  )}
                  {renderActionButton(action)}
                </React.Fragment>
              );
            })}
            {collapsed && (
              <button
                type="button"
                className={`${isVertical ? "inline-flex h-8 w-8 items-center justify-center rounded-md px-0" : "inline-flex h-8 items-center rounded-md px-1.5"} text-[10px] font-semibold ml-btn`}
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
            className={`fixed z-[260] max-h-[70vh] max-w-[calc(100vw-16px)] overflow-y-auto rounded-[8px] border p-2 shadow-[0_10px_24px_rgba(2,6,23,0.16)] ${isVertical ? "w-[108px]" : "w-[min(560px,calc(100vw-16px))]"} ${tConfig.ui} ${tConfig.uiBorder}`}
            ref={(el) => {
              overflowPanelRefs.current[section.key] = el;
              if (el) {
                requestAnimationFrame(() => {
                  setOverflowLayoutTick((previous) => previous + 1);
                });
              }
            }}
            style={{ ...getOverflowPanelStyle(section.key, isLastSection), ...noDragStyle }}
            onMouseEnter={() => openOverflow(section.key)}
            onMouseLeave={() => closeOverflowSoon(section.key)}
            data-overflow-panel={section.key}
          >
            <div className={`mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${isVertical ? "w-full justify-center" : ""}`}>
              {section.icon}
              {section.title}
            </div>
            <div className={`${isVertical ? "flex w-full flex-col items-center gap-1" : "flex max-w-full flex-wrap items-center gap-1 pb-0.5"}`}>
              {section.actions.map((action) => renderActionButton(action))}
            </div>
          </div>
        )}
      </div>
    );
  };



  const hiddenSectionButtons = hiddenSections.length > 0 && isVertical && (
    <div className="flex flex-col gap-1" style={noDragStyle}>
      {hiddenSections.map((section) => (
        <button
          key={`restore-${section.key}`}
          type="button"
          title={`${section.title} (${t["settings.presets.use"] || "Use"})`}
          onClick={() => onToolbarSectionChange(section.key, true)}
          className="rounded-[8px] border inline-flex items-center justify-center ml-btn h-8 w-8"
        >
          {section.icon}
        </button>
      ))}
    </div>
  );

  const positionClass =
    floatingToolbarAnchor === "bottom"
      ? `relative z-[120] border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)] overflow-visible ${tConfig.uiBorder} ${tConfig.ui}`
      : floatingToolbarAnchor === "left"
        ? `fixed left-0 top-[32px] h-[calc(100vh-32px)] z-[120] border-r overflow-y-auto overflow-x-visible ${tConfig.uiBorder} ${tConfig.ui}`
        : floatingToolbarAnchor === "right"
          ? `fixed right-0 top-[32px] h-[calc(100vh-32px)] z-[120] border-l overflow-y-auto overflow-x-visible ${tConfig.uiBorder} ${tConfig.ui}`
          : `relative z-[120] border-b overflow-visible ${tConfig.uiBorder} ${tConfig.ui}`;

  const rootStyle: React.CSSProperties = {
    fontFamily: tConfig.uiFont,
    ...(isVertical ? { width: "72px" } : {}),
  };

  return (
    <div
      className={`${positionClass} ${tConfig.fg}`}
      style={{ ...rootStyle, WebkitAppRegion: "drag", backgroundColor: floatingToolbarAnchor === "left" || floatingToolbarAnchor === "right" ? tConfig.uiHex : "transparent" } as React.CSSProperties}
    >
      {isVertical ? (
        <div className="h-full px-1 py-2 flex flex-col items-center gap-2">
          <div ref={centerRef} className="w-full space-y-2" style={noDragStyle}>
            {enabledSections.map((section) => renderSection(section))}
            {hiddenSectionButtons}
          </div>


        </div>
      ) : (
        <div className="flex h-11 items-center px-2" style={{ WebkitAppRegion: "drag", backgroundColor: tConfig.uiHex } as React.CSSProperties}>
          <div className="min-w-0 h-9 flex-1" ref={centerRef} style={{ WebkitAppRegion: "no-drag", ...noDragStyle } as React.CSSProperties}>
            <div
              className="flex h-9 items-center justify-start flex-nowrap w-full overflow-hidden"
              style={{
                gap: "clamp(0.3rem, 0.7vw, 0.8rem)",
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
      {showShortcutHints && shortcutOverlayItems.length > 0 && (
        <div className="pointer-events-none fixed left-1/2 top-[44px] -translate-x-1/2 z-[280] rounded-lg border px-3 py-2 shadow-[0_8px_20px_rgba(2,6,23,0.18)] text-[11px] backdrop-blur-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--ml-ui, #ffffff) 92%, transparent)", borderColor: "color-mix(in srgb, var(--ml-fg, #111827) 20%, transparent)" }}>
          <div className="font-semibold uppercase tracking-wide mb-1 opacity-80">Shortcuts</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {shortcutOverlayItems.map((item) => (
              <div key={item.id} className="inline-flex items-center justify-between gap-2 whitespace-nowrap">
                <span className="opacity-85">{item.label}</span>
                <span className="rounded px-1.5 py-0.5 border"
                  style={{ borderColor: "color-mix(in srgb, var(--ml-fg, #111827) 18%, transparent)" }}>
                  {item.shortcut}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopChrome;
