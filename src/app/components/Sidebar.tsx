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
import {
  useContextMenuTrigger,
  type ContextMenuEntry,
} from "./context-menu";

interface SidebarProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  workspacePath: string | null;
  workspaceTree: WorkspaceNode | null;
  onOpenFile: (path: string) => void;
  onOpenFolder: () => void;
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
  resolveItems: (node: WorkspaceNode) => ContextMenuEntry[];
  selectedPath: string | null;
  query: string;
}> = ({
  node,
  level,
  expandedPaths,
  onToggleExpand,
  onOpenFile,
  onSelect,
  resolveItems,
  selectedPath,
  query,
}) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedPath === node.path;
    const isVirtual = isVirtualNode(node.path);

    const { onContextMenu } = useContextMenuTrigger<HTMLButtonElement>({
      ref: buttonRef,
      resolveItems: () => resolveItems(node),
    });

    const normalized = query.trim().toLowerCase();
    const matchesSelf = node.name.toLowerCase().includes(normalized);
    const matchesChildren = hasChildren
      ? node.children!.some((child) => child.name.toLowerCase().includes(normalized))
      : false;

    if (normalized && !matchesSelf && !matchesChildren) return null;

    return (
      <div>
        <button
          ref={buttonRef}
          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${isSelected ? "ml-btn-active" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          onClick={() => {
            if (isVirtual) return;
            onSelect(node);
            if (node.is_dir) onToggleExpand(node.path);
            else onOpenFile(node.path);
          }}
          onContextMenu={isVirtual ? undefined : (e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(node);
            onContextMenu(e);
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
                resolveItems={resolveItems}
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
  onOpenFolder,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onReveal,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<WorkspaceNode | null>(null);
  const [query, setQuery] = useState("");

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

  const resolveItems = useCallback(
    (node: WorkspaceNode): ContextMenuEntry[] => {
      const items: ContextMenuEntry[] = [];

      items.push({
        type: "item",
        id: "rename",
        label: t["sidebar.rename"] || "Rename",
        icon: <Pencil size={13} />,
        onSelect: () => onRename(node.path),
      });

      if (node.is_dir) {
        items.push({
          type: "item",
          id: "new-file",
          label: t["sidebar.newFile"] || "New file",
          icon: <FilePlus2 size={13} />,
          onSelect: () => onCreateFile(node.path),
        });
        items.push({
          type: "item",
          id: "new-folder",
          label: t["sidebar.newFolder"] || "New folder",
          icon: <FolderPlus size={13} />,
          onSelect: () => onCreateFolder(node.path),
        });
      }

      items.push({
        type: "item",
        id: "reveal",
        label: t["sidebar.reveal"] || "Reveal in Explorer",
        icon: <ExternalLink size={13} />,
        onSelect: () => onReveal(node.path),
      });

      items.push({
        type: "item",
        id: "delete",
        label: t["sidebar.delete"] || "Delete",
        icon: <Trash2 size={13} />,
        danger: true,
        onSelect: () => onDelete(node.path),
      });

      return items;
    },
    [t, onRename, onCreateFile, onCreateFolder, onReveal, onDelete]
  );

  return (
    <aside className={`h-full ${tConfig.ui} ${tConfig.fg} flex flex-col`}>
      <div className={`h-10 border-b ${tConfig.uiBorder} px-2`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-10 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => onCreateFile(selectedBasePath)}
            title={t["sidebar.newFile"] || "New file"}
            aria-label={t["sidebar.newFile"] || "New file"}
            disabled={!workspacePath}
          >
            <FilePlus2 size={14} />
          </button>
          <button
            type="button"
            className="h-10 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => onCreateFolder(selectedBasePath)}
            title={t["sidebar.newFolder"] || "New folder"}
            aria-label={t["sidebar.newFolder"] || "New folder"}
            disabled={!workspacePath}
          >
            <FolderPlus size={14} />
          </button>
          <button
            type="button"
            className="h-10 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => selectedNode && onRename(selectedNode.path)}
            title={t["sidebar.rename"] || "Rename"}
            aria-label={t["sidebar.rename"] || "Rename"}
            disabled={!selectedNode || isVirtualNode(selectedNode.path)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="h-10 w-8 rounded-md ml-btn-danger inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => selectedNode && onDelete(selectedNode.path)}
            title={t["sidebar.delete"] || "Delete"}
            aria-label={t["sidebar.delete"] || "Delete"}
            disabled={!selectedNode || isVirtualNode(selectedNode.path)}
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            className="ml-auto h-10 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
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
        {workspacePath && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5">
            <Search size={14} />
            <input
              className="bg-transparent border-none outline-none w-full text-xs"
              placeholder={t["sidebar.search"] || "Search workspace"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        )}
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
          <div className="space-y-3 px-2 py-3 text-xs opacity-90">
            <div>{t["sidebar.empty"] || "No folder open"}</div>
            <button type="button" className="rounded-md border px-3 py-1.5 ml-btn" onClick={onOpenFolder}>
              {t["sidebar.openFolder"] || "Open folder"}
            </button>
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
              resolveItems={resolveItems}
              selectedPath={selectedNode?.path ?? null}
              query={query}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
