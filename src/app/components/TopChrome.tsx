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
  Minus,
  Palette,
  PanelLeft,
  Save,
  Search,
  Settings2,
  Sparkles,
  Square,
  SquarePen,
  X,
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
  sidebarWidth: number;
  viewMode: "edit" | "split" | "preview";
  toolbarSections: AppSettings["toolbarSections"];
  toolbarItems: AppSettings["toolbarItems"];
  toolbarDisplayMode: AppSettings["toolbarDisplayMode"];
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
  sidebarWidth,
  viewMode,
  toolbarSections,
  toolbarItems,
  toolbarDisplayMode,
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
  const sectionTitleRefs = useRef<Partial<Record<ToolbarSectionKey, HTMLDivElement | null>>>({});
  const measureButtonRefs = useRef<Partial<Record<ToolbarSectionKey, Array<HTMLButtonElement | null>>>>({});
  const [visibleCounts, setVisibleCounts] = useState<Partial<Record<ToolbarSectionKey, number>>>({});
  const [hoveredSection, setHoveredSection] = useState<ToolbarSectionKey | null>(null);

  const dragStyle: React.CSSProperties | undefined = canControlWindow
    ? ({ WebkitAppRegion: "drag" } as React.CSSProperties)
    : undefined;
  const noDragStyle: React.CSSProperties | undefined = canControlWindow
    ? ({ WebkitAppRegion: "no-drag" } as React.CSSProperties)
    : undefined;

  const runWindowAction = useCallback(
    async (action: "minimize" | "toggleMaximize" | "close") => {
      if (!canControlWindow) return;
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        if (action === "minimize") {
          await win.minimize();
          return;
        }
        if (action === "toggleMaximize") {
          await win.toggleMaximize();
          return;
        }
        await win.close();
      } catch {
        // no-op
      }
    },
    [canControlWindow]
  );

  const sections = useMemo<ToolbarSectionModel[]>(
    () => [
      {
        key: "files",
        title: t["toolbar.files"] || "Files",
        icon: <FolderOpen size={11} />,
        actions: [
          toolbarItems.fileNew
            ? { id: "file-new", label: t["file.new"] || "New", icon: <FilePlus2 size={13} />, onClick: onNewFile }
            : null,
          toolbarItems.fileOpen
            ? { id: "file-open", label: t["file.open"] || "Open", icon: <FolderOpen size={13} />, onClick: onOpenFile }
            : null,
          toolbarItems.fileOpenFolder
            ? {
                id: "file-open-folder",
                label: t["file.openFolder"] || "Open folder",
                icon: <FolderOpen size={13} />,
                onClick: onOpenFolder,
              }
            : null,
          toolbarItems.fileSave
            ? { id: "file-save", label: t["file.save"] || "Save", icon: <Save size={13} />, onClick: onSave }
            : null,
          toolbarItems.fileExport
            ? { id: "file-export", label: t["file.export"] || "Export", icon: <Download size={13} />, onClick: onExport }
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
              }
            : null,
          toolbarItems.sysSnippets
            ? {
                id: "sys-snippets",
                label: t["edit.snippets"] || "Snippets",
                icon: <Sparkles size={13} />,
                onClick: onOpenSnippets,
              }
            : null,
          toolbarItems.sysTheme
            ? {
                id: "sys-theme",
                label: t["toolbar.theme"] || "Theme",
                icon: <Palette size={13} />,
                onClick: onCycleTheme,
              }
            : null,
          toolbarItems.sysSidebar
            ? {
                id: "sys-sidebar",
                label: t["view.sidebar"] || "Sidebar",
                icon: <PanelLeft size={13} />,
                onClick: onToggleSidebar,
                active: sidebarEnabled,
              }
            : null,
          toolbarItems.sysEdit
            ? {
                id: "sys-edit",
                label: t["view.editor"] || "Edit",
                icon: <SquarePen size={13} />,
                onClick: () => onViewModeChange("edit"),
                active: viewMode === "edit",
              }
            : null,
          toolbarItems.sysSplit
            ? {
                id: "sys-split",
                label: t["view.split"] || "Split",
                icon: <Columns2 size={13} />,
                onClick: () => onViewModeChange("split"),
                active: viewMode === "split",
              }
            : null,
          toolbarItems.sysPreview
            ? {
                id: "sys-preview",
                label: t["view.preview"] || "Preview",
                icon: <Eye size={13} />,
                onClick: () => onViewModeChange("preview"),
                active: viewMode === "preview",
              }
            : null,
          toolbarItems.sysZen
            ? {
                id: "sys-zen",
                label: t["view.zen"] || "Zen",
                icon: <Focus size={13} />,
                onClick: onToggleZen,
              }
            : null,
          {
            id: "sys-settings",
            label: t["settings"] || "Settings",
            icon: <Settings2 size={13} />,
            onClick: onOpenSettings,
          },
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
              }
            : null,
          toolbarItems.editItalic
            ? {
                id: "edit-italic",
                label: t["tool.italic"] || "Italic",
                icon: <i className="text-xs">I</i>,
                onClick: () => onFormatAction("italic"),
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
              }
            : null,
          toolbarItems.editOL
            ? {
                id: "edit-ol",
                label: t["tool.ol"] || "OL",
                icon: <ListOrdered size={13} />,
                onClick: () => onFormatAction("ol"),
              }
            : null,
          toolbarItems.editTask
            ? {
                id: "edit-task",
                label: t["tool.task"] || "Task",
                icon: <CheckSquare size={13} />,
                onClick: () => onFormatAction("task"),
              }
            : null,
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

  const setMeasureButtonRef = (sectionKey: ToolbarSectionKey, index: number, el: HTMLButtonElement | null) => {
    if (!measureButtonRefs.current[sectionKey]) {
      measureButtonRefs.current[sectionKey] = [];
    }
    measureButtonRefs.current[sectionKey]![index] = el;
  };

  const recomputeVisibleCounts = useCallback(() => {
    const next: Partial<Record<ToolbarSectionKey, number>> = {};

    for (const section of enabledSections) {
      if (isVertical) {
        next[section.key] = section.actions.length;
        continue;
      }

      const frame = sectionFrameRefs.current[section.key];
      const title = sectionTitleRefs.current[section.key];

      if (!frame || !title) {
        next[section.key] = section.actions.length;
        continue;
      }

      const frameWidth = frame.clientWidth;
      const titleWidth = title.getBoundingClientRect().width;
      const available = Math.max(0, frameWidth - titleWidth - 36);
      const badgeWidth = 28;
      const gap = 4;

      const measuredWidths = section.actions.map((_, index) => {
        const node = measureButtonRefs.current[section.key]?.[index];
        if (node) return Math.ceil(node.getBoundingClientRect().width);
        return showLabel ? 86 : 32;
      });

      let used = 0;
      let count = 0;

      for (let index = 0; index < measuredWidths.length; index += 1) {
        const nextWidth = measuredWidths[index] + (count > 0 ? gap : 0);
        if (used + nextWidth > available) break;
        used += nextWidth;
        count += 1;
      }

      if (count < section.actions.length) {
        while (count > 1 && used + badgeWidth > available) {
          used -= measuredWidths[count - 1];
          count -= 1;
          if (count > 0) used -= gap;
        }
      }

      if (section.actions.length > 0 && count === 0) {
        count = 1;
      }

      next[section.key] = Math.max(0, Math.min(count, section.actions.length));
    }

    setVisibleCounts((previous) => {
      const keys = Object.keys(next) as ToolbarSectionKey[];
      const changed = keys.some((key) => previous[key] !== next[key]);
      return changed ? next : previous;
    });
  }, [enabledSections, isVertical, showLabel]);

  useEffect(() => {
    const raf = requestAnimationFrame(recomputeVisibleCounts);
    return () => cancelAnimationFrame(raf);
  }, [recomputeVisibleCounts]);

  useEffect(() => {
    if (isVertical) return;

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
  }, [enabledSections, isVertical, recomputeVisibleCounts]);

  const renderActionButton = (action: ToolbarAction) => (
    <button
      key={action.id}
      className={`${isVertical ? "h-8 w-8 px-0 justify-center" : "h-8 px-2"} min-w-0 inline-flex items-center gap-1.5 rounded-md border text-xs transition-colors ml-btn ${
        action.active ? "ml-btn-active" : ""
      }`}
      onClick={action.onClick}
      title={action.label}
      type="button"
      style={noDragStyle}
    >
      {showIcon && action.icon}
      {showLabel && <span className="truncate">{action.label}</span>}
    </button>
  );

  const renderSection = (section: ToolbarSectionModel) => {
    const visibleCount = isVertical ? section.actions.length : visibleCounts[section.key] ?? section.actions.length;
    const clampedVisibleCount = Math.max(0, Math.min(visibleCount, section.actions.length));
    const collapsed = !isVertical && clampedVisibleCount < section.actions.length;
    const visibleActions = collapsed ? section.actions.slice(0, clampedVisibleCount) : section.actions;

    return (
      <div
        key={section.key}
        className={`relative min-w-0 rounded-lg border ${tConfig.uiBorder} ${tConfig.ui}`}
        ref={(el) => {
          sectionFrameRefs.current[section.key] = el;
        }}
        onMouseEnter={() => {
          if (collapsed) setHoveredSection(section.key);
        }}
        onMouseLeave={() => {
          if (hoveredSection === section.key) setHoveredSection(null);
        }}
      >
        {!isVertical && (
          <div className="absolute left-0 top-0 -z-10 opacity-0 pointer-events-none whitespace-nowrap">
            {section.actions.map((action, index) => (
              <button
                key={`${action.id}-measure`}
                ref={(el) => setMeasureButtonRef(section.key, index, el)}
                type="button"
                className={`${isVertical ? "h-8 w-8 px-0 justify-center" : "h-8 px-2"} inline-flex items-center gap-1.5 rounded-md border text-xs`}
              >
                {showIcon && action.icon}
                {showLabel && <span>{action.label}</span>}
              </button>
            ))}
          </div>
        )}

        <div className={`${isVertical ? "flex flex-col items-center gap-1 p-1.5" : "flex min-w-0 items-center gap-2 px-2 py-1 overflow-hidden"}`}>
          {!isVertical && (
            <>
              <div
                ref={(el) => {
                  sectionTitleRefs.current[section.key] = el;
                }}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide"
              >
                {section.icon}
                {section.title}
              </div>
              <div className="h-5 w-px bg-black/25 dark:bg-white/25 shrink-0" />
            </>
          )}

          <div className={`${isVertical ? "flex flex-col items-center gap-1" : "flex min-w-0 items-center gap-1 overflow-hidden"}`}>
            {visibleActions.map((action) => renderActionButton(action))}
            {collapsed && (
              <span className={`inline-flex h-6 items-center rounded border px-1.5 text-[10px] font-semibold ${tConfig.uiBorder}`}>
                +{section.actions.length - clampedVisibleCount}
              </span>
            )}
          </div>
        </div>

        {collapsed && hoveredSection === section.key && (
          <div
            className={`absolute left-0 top-0 z-[210] rounded-lg border p-2 shadow-2xl ${tConfig.ui} ${tConfig.uiBorder}`}
            style={noDragStyle}
            onMouseEnter={() => setHoveredSection(section.key)}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
              {section.icon}
              {section.title}
            </div>
            <div className="inline-flex items-center gap-1 whitespace-nowrap">
              {section.actions.map((action) => renderActionButton(action))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const windowControls = (
    <div className={`${isVertical ? "mt-auto flex flex-col items-center gap-1" : "flex items-center gap-1"}`} style={noDragStyle}>
      <button
        type="button"
        title="Minimize"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors ml-btn"
        onClick={() => runWindowAction("minimize")}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        title="Restore"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors ml-btn"
        onClick={() => runWindowAction("toggleMaximize")}
      >
        <Square size={12} />
      </button>
      <button
        type="button"
        title="Close"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors ml-btn-danger"
        onClick={() => runWindowAction("close")}
      >
        <X size={14} />
      </button>
    </div>
  );

  const hiddenSectionButtons = hiddenSections.length > 0 && isVertical && (
    <div className="flex flex-col gap-1" style={noDragStyle}>
      {hiddenSections.map((section) => (
        <button
          key={`restore-${section.key}`}
          type="button"
          title={`${section.title} (${t["settings.presets.use"] || "Use"})`}
          onClick={() => onToolbarSectionChange(section.key, true)}
          className="rounded-md border inline-flex items-center justify-center ml-btn h-8 w-8"
        >
          {section.icon}
        </button>
      ))}
    </div>
  );

  const positionClass =
    floatingToolbarAnchor === "bottom"
      ? `fixed left-0 right-0 bottom-0 z-[120] border-t ${tConfig.uiBorder} ${tConfig.ui}`
      : floatingToolbarAnchor === "left"
      ? `fixed top-0 bottom-0 z-[120] border-r ${tConfig.uiBorder} ${tConfig.ui}`
      : floatingToolbarAnchor === "right"
      ? `fixed top-0 bottom-0 right-0 z-[120] border-l ${tConfig.uiBorder} ${tConfig.ui}`
      : `border-b ${tConfig.uiBorder} ${tConfig.ui}`;

  const rootStyle: React.CSSProperties = {
    fontFamily: tConfig.uiFont,
    ...(floatingToolbarAnchor === "left" ? { left: `${sidebarEnabled ? sidebarWidth + 12 : 0}px` } : {}),
    ...(isVertical ? { width: "72px" } : {}),
  };

  return (
    <div className={`${positionClass} ${tConfig.fg}`} style={{ ...rootStyle, ...dragStyle }} data-tauri-drag-region={canControlWindow ? "true" : undefined}>
      {isVertical ? (
        <div className="h-full px-1 py-2 flex flex-col items-center gap-2 overflow-y-auto">
          <div className="flex flex-col items-center gap-1 px-1" style={noDragStyle}>
            <img src="/img/logo.png" alt="Mark-Lee" className={`h-8 w-8 rounded border ${tConfig.uiBorder}`} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Mark-Lee</span>
          </div>

          <div ref={centerRef} className="w-full space-y-2" style={noDragStyle}>
            {enabledSections.map((section) => renderSection(section))}
            {hiddenSectionButtons}
          </div>

          {windowControls}
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-[152px]" style={noDragStyle}>
            <img src="/img/logo.png" alt="Mark-Lee" className={`h-7 w-7 rounded border ${tConfig.uiBorder}`} />
            <span className="text-sm font-semibold tracking-wide">Mark-Lee</span>
          </div>

          <div className="min-w-0" ref={centerRef} style={noDragStyle}>
            <div
              className="grid items-stretch"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, enabledSections.length)}, minmax(0, 1fr))`,
                gap: "clamp(0.35rem, 0.8vw, 0.9rem)",
              }}
            >
              {enabledSections.map((section) => renderSection(section))}
            </div>
          </div>

          {windowControls}
        </div>
      )}
      <div className="sr-only">{sidebarEnabled ? "sidebar-enabled" : "sidebar-disabled"}</div>
      <div className="sr-only">{viewMode}</div>
    </div>
  );
};

export default TopChrome;
