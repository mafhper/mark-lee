import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    FilePlus2,
    FolderOpen,
    FolderPlus,
    Save,
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
  /** Faixa colapsada: acoes e arvore em icones/uma inicial por linha. */
  compacto?: boolean;
  workspaceTree: WorkspaceNode | null;
  onOpenFile: (path: string) => void;
  onOpenFolder: () => void;
  /** Salvar o documento ativo, pelo mesmo caminho do menu e da barra. */
  onSave?: () => void;
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
  /** Ações da própria linha, mostradas no hover. Quem as executa é o App: a
   *  árvore não deve conhecer o sistema de arquivos. */
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onReveal: (path: string) => void;
  t: Record<string, string>;
  selectedPath: string | null;
  query: string;
  /** Colapsado: uma inicial por linha, sem recursão e sem texto. */
  compacto?: boolean;
}> = ({
  node,
  level,
  expandedPaths,
onToggleExpand,
  onOpenFile,
  onSelect,
  resolveItems,
  onRename,
  onDelete,
  onReveal,
  t,
  selectedPath,
  query,
  compacto = false,
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

    // Modo compacto: cabe uma letra por linha numa faixa de 36px. Sem recursão
    // — a árvore inteira vira uma coluna — e sem texto, com o nome inteiro no
    // `title` para o hover. Profundidade vira **tom**: um arquivo e uma pasta
    // com filhos não podem ter a mesma cor.
    if (compacto) {
      const tom = node.is_dir
        ? hasChildren
          ? "text-[color:var(--ml-accent)]"
          : "opacity-80"
        : "opacity-55";
      return (
        <button
          ref={buttonRef}
          type="button"
          className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold uppercase ${tom} ${
            isSelected ? "ml-btn-active" : "hover:bg-black/5 dark:hover:bg-white/10"
          }`}
          title={node.name}
          aria-label={node.name}
          onClick={() => {
            if (isVirtual) return;
            onSelect(node);
            if (node.is_dir) onToggleExpand(node.path);
            else onOpenFile(node.path);
          }}
          onContextMenu={
            isVirtual
              ? undefined
              : (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(node);
                  onContextMenu(e);
                }
          }
        >
          {node.name.replace(/^[^A-Za-zÀ-ÿ0-9]+/, "").charAt(0) || "·"}
        </button>
      );
    }

return (
      // `group` + `group-hover` + `absolute`: as ações do item aparecem no hover
      // **sem reservar espaço**. Se estivessem no fluxo, cada linha da árvore
      // ganharia ~24px de largura para controles que quase nunca estão à vista —
      // e o nome do arquivo, que é o que se lê, seria espremido para sempre.
      <div className="group relative">
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
        {/* Renomear, apagar e revelar, na linha do próprio item. Não aparecem no
            nó virtual: "recent files" não é um arquivo do workspace, e oferecer
            renomear algo que não tem lugar no disco seria um botão que não
            pode funcionar. */}
        {!isVirtual && (
          <span
            className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 pl-1"
            style={{ backgroundColor: "var(--ml-ui, transparent)" }}
          >
            <button
              type="button"
              className="h-6 w-6 rounded ml-btn inline-flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onRename(node.path);
              }}
              title={t["sidebar.rename"] || "Rename"}
              aria-label={t["sidebar.rename"] || "Rename"}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              className="h-6 w-6 rounded ml-btn-danger inline-flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.path);
              }}
              title={t["sidebar.delete"] || "Delete"}
              aria-label={t["sidebar.delete"] || "Delete"}
            >
              <Trash2 size={12} />
            </button>
            <button
              type="button"
              className="h-6 w-6 rounded ml-btn inline-flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onReveal(node.path);
              }}
              title={t["sidebar.reveal"] || "Reveal"}
              aria-label={t["sidebar.reveal"] || "Reveal"}
            >
              <ExternalLink size={12} />
            </button>
          </span>
        )}
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
                onRename={onRename}
                onDelete={onDelete}
                onReveal={onReveal}
                t={t}
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
  compacto = false,
  workspacePath,
  workspaceTree,
  onOpenFile,
onOpenFolder,
  onSave,
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
      {/* Colapsado: as ações viram uma coluna de ícones. Horizontais elas ficariam
          com 16px de largura dentro dos 36px — medido, e inutilizáveis. */}
{compacto ? (
        /* Recolhida, a coluna espelha as **mesmas quatro ações** do cabeçalho
           expandido — salvar, criar arquivo, criar pasta, abrir pasta. Ela ainda
           trazia as cinco antigas, o que significava duas coisas ruins ao mesmo
           tempo: as ações que o desenho do dono mandou para o hover da linha
           continuavam aqui, e a coluna tinha um botão a mais numa faixa de 35px,
           que é a faixa onde cada pixel conta.

           Renomear, apagar e revelar **não foram perdidos** recolhida: continuam
           no botão direito da linha, que é o caminho que não depende de largura
           nem de hover — e por isso é o que funciona também em 35px.

           **Sem pasta aberta, só entra o que dá para fazer.** As quatro ações
           dependem de `workspacePath`, então sem workspace as quatro ficam
           desabilitadas — e nenhuma ação da própria tela consegue habilitá-las.
           Três botões apagados a 40% de opacidade numa faixa de 35px é exatamente
           a aparência de "ícones diminutos e achatados" que o dono apontou: não é
           tamanho, é **cansaço visual de alvo morto**. Recolhida e sem pasta, a
           coluna mostra só a ação possível: abrir pasta. */
        <div className={`h-10 border-b ${tConfig.uiBorder} px-0.5`}>
          <div className="flex flex-col items-center gap-0.5 py-0.5">
            {(workspacePath
              ? [
                { rot: Save, on: () => onSave?.(), rot2: t["file.save"] || "Save" },
                { rot: FilePlus2, on: () => onCreateFile(selectedBasePath), rot2: t["sidebar.newFile"] || "New file" },
                { rot: FolderPlus, on: () => onCreateFolder(selectedBasePath), rot2: t["sidebar.newFolder"] || "New folder" },
                { rot: FolderOpen, on: onOpenFolder, rot2: t["file.openFolder"] || "Open folder" },
              ]
              : [{ rot: FolderOpen, on: onOpenFolder, rot2: t["file.openFolder"] || "Open folder" }]
            ).map(({ rot: Icone, on, rot2 }) => (
              <button
                key={rot2}
                type="button"
                className="h-7 w-7 rounded-md inline-flex items-center justify-center ml-btn"
                onClick={on}
                title={rot2}
                aria-label={rot2}
              >
                <Icone size={14} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`h-10 border-b ${tConfig.uiBorder} px-2`}>
        {/* As quatro ações de **documento e workspace**, nesta ordem: salvar,
            criar arquivo, criar pasta, abrir pasta.

            As três que agem sobre o **item selecionado** — renomear, apagar e
            revelar — saíram daqui e foram para a **linha do arquivo**, no hover.
            A regra é do dono e é a certa: uma ação sobre o que está selecionado
            pertence a onde a seleção está, e a barra do topo da lateral ficava
            meio passo atrás do cursor. */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-10 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={() => onSave?.()}
            title={t["file.save"] || "Save"}
            aria-label={t["file.save"] || "Save"}
            disabled={!workspacePath}
          >
            <Save size={14} />
          </button>
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
            className="ml-auto h-10 w-8 rounded-md ml-btn inline-flex items-center justify-center disabled:opacity-40"
            onClick={onOpenFolder}
            title={t["file.openFolder"] || "Open folder"}
            aria-label={t["file.openFolder"] || "Open folder"}
            disabled={!workspacePath}
          >
            <FolderOpen size={14} />
          </button>
        </div>
      </div>
      )}

      {/* Colapsado não há busca nem cabeçalho de seção: numa faixa de 36px os dois
          viriam espremidos e ilegíveis. A busca continua no atalho, que é o
          caminho de verdade para ela. */}
      {!compacto && (
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
      )}
      <div className={`flex-1 overflow-auto ${compacto ? "p-0.5 pt-1" : "p-2"}`}>
{!workspaceTree && !compacto && (
          <div className="space-y-3 px-2 py-3 text-xs opacity-90">
            <div>{t["sidebar.empty"] || "No folder open"}</div>
            <button type="button" className="rounded-md border px-3 py-1.5 ml-btn" onClick={onOpenFolder}>
              {t["sidebar.openFolder"] || "Open folder"}
            </button>
          </div>
        )}
        {/* Recolhida, o estado vazio não mostra botão nenhum: a coluna do cabeçalho já
            tem "Abrir pasta", e as duas juntas davam **dois botões idênticos
            empilhados** numa faixa de 35px — que é o que a captura do dono
            mostrou. Expandida os dois continuam: ali o cabeçalho tem quatro ações e
            o estado vazio é o convite que diz o que fazer a seguir. */}
        {!workspaceTree && compacto && (
          <div className="flex justify-center pt-1">
            <span className="text-[9px] opacity-45" aria-hidden>
              {t["sidebar.empty"] || "No folder open"}
            </span>
          </div>
        )}
        {workspaceTree && (
          <div className="rounded-md p-1">
            <SidebarTreeNode
node={workspaceTree}
              level={0}
                  compacto={compacto}
                  expandedPaths={expandedPaths}
              onToggleExpand={toggleExpand}
              onOpenFile={onOpenFile}
              onSelect={(node) => {
                setSelectedNode(node);
              }}
resolveItems={resolveItems}
              onRename={onRename}
              onDelete={onDelete}
              onReveal={onReveal}
              t={t}
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
