import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { ThemeConfig, WorkspaceNode } from "../../types";

interface ContextMenuState {
  x: number;
  y: number;
  node: WorkspaceNode;
}

interface SidebarProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  workspacePath: string | null;
  workspaceTree: WorkspaceNode | null;
  onOpenFile: (path: string) => void;
  onCreateFile: (basePath: string) => void;
  onCreateFolder: (basePath: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onReveal: (path: string) => void;
}

const VIRTUAL_NODE_PREFIX = "__mark_lee_virtual__:";

function isVirtualNode(path: string) {
  return path.startsWith(VIRTUAL_NODE_PREFIX);
}

const SidebarTreeNode: React.FC<{
  node: WorkspaceNode;
  level: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onOpenFile: (path: string) => void;
  onSelect: (node: WorkspaceNode) => void;
  onContextMenu: (e: React.MouseEvent, node: WorkspaceNode) => void;
  selectedPath: string | null;
  query: string;
}> = ({
  node,
  level,
  expandedPaths,
  onToggleExpand,
  onOpenFile,
  onSelect,
  onContextMenu,
  selectedPath,
  query,
}) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedPath === node.path;
    const isVirtual = isVirtualNode(node.path);

    const normalized = query.trim().toLowerCase();
    const matchesSelf = node.name.toLowerCase().includes(normalized);
    const matchesChildren = hasChildren
      ? node.children!.some((child) => child.name.toLowerCase().includes(normalized))
      : false;

    if (normalized && !matchesSelf && !matchesChildren) return null;

    return (
      <div>
        <button
          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${isSelected ? "ml-btn-active" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          onClick={() => {
            if (isVirtual) return;
            onSelect(node);
            if (node.is_dir) onToggleExpand(node.path);
            else onOpenFile(node.path);
          }}
          onContextMenu={(e) => {
            if (isVirtual) return;
            e.preventDefault();
            e.stopPropagation();
            onSelect(node);
            onContextMenu(e, node);
          }}
        >
          {node.is_dir ? (
            hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )
            ) : (
              <span className="w-[14px]" />
            )
          ) : (
            <span className="w-[14px]" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.is_dir && isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => (
              <SidebarTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onOpenFile={onOpenFile}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                selectedPath={selectedPath}
                query={query}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

const Sidebar: React.FC<SidebarProps> = ({
  t,
  tConfig,
  workspacePath,
  workspaceTree,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onReveal,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<WorkspaceNode | null>(null);
  const [query, setQuery] = useState("");
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  const rootPath = workspacePath ?? "";

  const selectedBasePath = useMemo(() => {
    if (!selectedNode) return rootPath;
    if (isVirtualNode(selectedNode.path)) return rootPath;
    return selectedNode.is_dir
      ? selectedNode.path
      : selectedNode.path.replace(/[/\\][^/\\]+$/, "");
  }, [rootPath, selectedNode]);

  useEffect(() => {
    if (!workspaceTree) return;
    setExpandedPaths(new Set([workspaceTree.path]));
  }, [workspaceTree?.path]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: WorkspaceNode) => {
      setCtxMenu({ x: e.clientX, y: e.clientY, node });
    },
    []
  );

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  // Close context menu on click-outside or Escape
  useEffect(() => {
    if (!ctxMenu) return;

    const onClickOutside = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        closeCtxMenu();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCtxMenu();
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ctxMenu, closeCtxMenu]);

  const ctxMenuItems = useMemo(() => {
    if (!ctxMenu) return [];
    const node = ctxMenu.node;
    const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [];

    items.push({
      label: t["sidebar.rename"] || "Rename",
      icon: <Pencil size={13} />,
      onClick: () => { onRename(node.path); closeCtxMenu(); },
    });

    if (node.is_dir) {
      items.push({
        label: t["sidebar.newFile"] || "New file",
        icon: <FilePlus2 size={13} />,
        onClick: () => { onCreateFile(node.path); closeCtxMenu(); },
      });
      items.push({
        label: t["sidebar.newFolder"] || "New folder",
        icon: <FolderPlus size={13} />,
        onClick: () => { onCreateFolder(node.path); closeCtxMenu(); },
      });
    }

    items.push({
      label: t["sidebar.reveal"] || "Reveal in Explorer",
      icon: <ExternalLink size={13} />,
      onClick: () => { onReveal(node.path); closeCtxMenu(); },
    });

    items.push({
      label: t["sidebar.delete"] || "Delete",
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: () => { onDelete(node.path); closeCtxMenu(); },
    });

    return items;
  }, [ctxMenu, t, onRename, onCreateFile, onCreateFolder, onReveal, onDelete, closeCtxMenu]);

  return (
    <aside className={`h-full ${tConfig.ui} ${tConfig.fg} flex flex-col`}>
      <div className={`border-b ${tConfig.uiBorder} p-2`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-8 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => onCreateFile(selectedBasePath)}
            title={t["sidebar.newFile"] || "New file"}
            aria-label={t["sidebar.newFile"] || "New file"}
            disabled={!workspacePath}
          >
            <FilePlus2 size={14} />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => onCreateFolder(selectedBasePath)}
            title={t["sidebar.newFolder"] || "New folder"}
            aria-label={t["sidebar.newFolder"] || "New folder"}
            disabled={!workspacePath}
          >
            <FolderPlus size={14} />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => selectedNode && onRename(selectedNode.path)}
            title={t["sidebar.rename"] || "Rename"}
            aria-label={t["sidebar.rename"] || "Rename"}
            disabled={!selectedNode || isVirtualNode(selectedNode.path)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-md ml-btn-danger inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => selectedNode && onDelete(selectedNode.path)}
            title={t["sidebar.delete"] || "Delete"}
            aria-label={t["sidebar.delete"] || "Delete"}
            disabled={!selectedNode || isVirtualNode(selectedNode.path)}
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            className="ml-auto h-8 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => onReveal(selectedNode?.path ?? workspacePath ?? "")}
            title={t["sidebar.reveal"] || "Reveal"}
            aria-label={t["sidebar.reveal"] || "Reveal"}
            disabled={!workspacePath}
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5">
          <Search size={14} />
          <input
            className="bg-transparent border-none outline-none w-full text-xs"
            placeholder={t["sidebar.search"] || "Search workspace"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {workspacePath && (
          <div className="px-1 pt-1">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] opacity-55">
              {t["sidebar.title"] || "Workspace"}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {!workspaceTree && (
          <div className="text-xs px-2 py-3 opacity-80">
            {t["sidebar.empty"] || "No folder open"}
          </div>
        )}
        {workspaceTree && (
          <div className="rounded-md p-1">
            <SidebarTreeNode
              node={workspaceTree}
              level={0}
              expandedPaths={expandedPaths}
              onToggleExpand={toggleExpand}
              onOpenFile={onOpenFile}
              onSelect={(node) => {
                setSelectedNode(node);
              }}
              onContextMenu={handleContextMenu}
              selectedPath={selectedNode?.path ?? null}
              query={query}
            />
          </div>
        )}
      </div>
      {/* Context Menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className={`fixed z-[300] min-w-[180px] rounded-lg border shadow-xl py-1 ${tConfig.ui} ${tConfig.uiBorder} ${tConfig.fg}`}
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          {ctxMenuItems.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${item.danger
                ? "text-red-400 hover:bg-red-500/10"
                : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              onClick={item.onClick}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
