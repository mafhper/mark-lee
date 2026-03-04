import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { ThemeConfig, WorkspaceNode } from "../../types";

interface SidebarProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  workspacePath: string | null;
  workspaceTree: WorkspaceNode | null;
  onOpenFolder: () => void;
  onOpenFile: (path: string) => void;
  onCreateFile: (basePath: string) => void;
  onCreateFolder: (basePath: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onReveal: (path: string) => void;
}

const SidebarTreeNode: React.FC<{
  node: WorkspaceNode;
  level: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onOpenFile: (path: string) => void;
  onSelect: (node: WorkspaceNode) => void;
  selectedPath: string | null;
  query: string;
}> = ({
  node,
  level,
  expandedPaths,
  onToggleExpand,
  onOpenFile,
  onSelect,
  selectedPath,
  query,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const normalized = query.trim().toLowerCase();
  const matchesSelf = node.name.toLowerCase().includes(normalized);
  const matchesChildren = hasChildren
    ? node.children!.some((child) => child.name.toLowerCase().includes(normalized))
    : false;

  if (normalized && !matchesSelf && !matchesChildren) return null;

  return (
    <div>
      <button
        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 ${
          isSelected ? "ml-btn-active" : "hover:bg-black/5 dark:hover:bg-white/10"
        }`}
        style={{ paddingLeft: `${8 + level * 14}px` }}
        onClick={() => {
          onSelect(node);
          if (node.is_dir) onToggleExpand(node.path);
          else onOpenFile(node.path);
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
  onOpenFolder,
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

  const rootPath = workspacePath ?? "";

  const selectedBasePath = useMemo(() => {
    if (!selectedNode) return rootPath;
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

  return (
    <aside className={`h-full border-r ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg} flex flex-col`}>
      <div className={`p-2 border-b ${tConfig.uiBorder} space-y-2`}>
        <button
          onClick={onOpenFolder}
          className="w-full px-2 py-1.5 rounded text-xs flex items-center justify-center gap-2 ml-btn-primary"
        >
          <FolderOpen size={14} />
          {t["sidebar.openFolder"] || "Open folder"}
        </button>
        <div className={`flex items-center gap-2 px-2 py-1 rounded border ${tConfig.uiBorder}`}>
          <Search size={14} />
          <input
            className="bg-transparent border-none outline-none w-full text-xs"
            placeholder={t["sidebar.search"] || "Search workspace"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {workspacePath && (
          <div className="grid grid-cols-2 gap-1">
            <button
              className="px-2 py-1 rounded text-[11px] border hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center gap-1"
              onClick={() => onCreateFile(selectedBasePath)}
            >
              <FilePlus2 size={12} />
              {t["sidebar.newFile"] || "New file"}
            </button>
            <button
              className="px-2 py-1 rounded text-[11px] border hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center gap-1"
              onClick={() => onCreateFolder(selectedBasePath)}
            >
              <FolderPlus size={12} />
              {t["sidebar.newFolder"] || "New folder"}
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {!workspaceTree && (
          <div className="text-xs px-2 py-3">
            {t["sidebar.openFolder"] || "Open folder"}
          </div>
        )}
        {workspaceTree && (
          <SidebarTreeNode
            node={workspaceTree}
            level={0}
            expandedPaths={expandedPaths}
            onToggleExpand={toggleExpand}
            onOpenFile={onOpenFile}
            onSelect={(node) => {
              setSelectedNode(node);
            }}
            selectedPath={selectedNode?.path ?? null}
            query={query}
          />
        )}
      </div>
      {selectedNode && (
        <div className={`p-2 border-t ${tConfig.uiBorder} grid grid-cols-4 gap-1`}>
          <button
            title={t["sidebar.rename"] || "Rename"}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => onRename(selectedNode.path)}
          >
            <Pencil size={14} className="mx-auto" />
          </button>
          <button
            title={t["sidebar.delete"] || "Delete"}
            className="p-1 rounded ml-btn-danger"
            onClick={() => onDelete(selectedNode.path)}
          >
            <Trash2 size={14} className="mx-auto" />
          </button>
          <button
            title={t["sidebar.reveal"] || "Reveal"}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => onReveal(selectedNode.path)}
          >
            <ExternalLink size={14} className="mx-auto" />
          </button>
          {selectedNode.is_dir && (
            <button
              title={t["sidebar.newFile"] || "New file"}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => onCreateFile(selectedNode.path)}
            >
              <FilePlus2 size={14} className="mx-auto" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
