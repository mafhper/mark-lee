import React, { useCallback, useRef } from "react";
import { Plus, X } from "lucide-react";
import { DocumentTab, ThemeConfig } from "../../types";
import {
  useContextMenuTrigger,
  type ContextMenuEntry,
} from "./context-menu";

interface EditorTabsProps {
  tabs: DocumentTab[];
  activeTabId: string | null;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseRight: (id: string) => void;
  onCloseSaved: () => void;
  onCloseAll: () => void;
  onNewTab: () => void;
}

const EditorTab: React.FC<{
  tab: DocumentTab;
  isActive: boolean;
  t: Record<string, string>;
  tConfig: ThemeConfig;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseRight: (id: string) => void;
  onCloseSaved: () => void;
  onCloseAll: () => void;
}> = ({ tab, isActive, t, tConfig, onActivate, onClose, onCloseOthers, onCloseRight, onCloseSaved, onCloseAll }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const resolveItems = useCallback(
    (): ContextMenuEntry[] => [
      {
        type: "item",
        id: "close",
        label: t["tabs.close"] || "Close",
        onSelect: () => onClose(tab.id),
      },
      {
        type: "item",
        id: "close-others",
        label: t["tabs.closeOthers"] || "Close Others",
        onSelect: () => onCloseOthers(tab.id),
      },
      {
        type: "item",
        id: "close-right",
        label: t["tabs.closeRight"] || "Close to the Right",
        onSelect: () => onCloseRight(tab.id),
      },
      {
        type: "item",
        id: "close-saved",
        label: t["tabs.closeSaved"] || "Close Saved",
        onSelect: () => onCloseSaved(),
      },
      {
        type: "item",
        id: "close-all",
        label: t["tabs.closeAll"] || "Close All",
        onSelect: () => onCloseAll(),
      },
    ],
    [t, tab.id, onClose, onCloseOthers, onCloseRight, onCloseSaved, onCloseAll]
  );

  const { onContextMenu } = useContextMenuTrigger<HTMLDivElement>({
    ref,
    resolveItems,
  });

  return (
    <div
      ref={ref}
      onClick={() => onActivate(tab.id)}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(tab.id);
        }
      }}
      role="button"
      tabIndex={0}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border ${isActive
          ? "ml-btn-active"
          : `${tConfig.uiBorder} hover:bg-black/5 dark:hover:bg-white/10`
        }`}
    >
      <span className="truncate max-w-[140px]">
        {tab.name}
        {tab.dirty ? "*" : ""}
      </span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose(tab.id);
        }}
        className="ml-btn inline-flex items-center justify-center h-5 w-5"
        title={t["tabs.close"] || "Close"}
        type="button"
      >
        <X size={12} />
      </button>
    </div>
  );
};

const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  t,
  tConfig,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseRight,
  onCloseSaved,
  onCloseAll,
  onNewTab,
}) => {
  return (
    <div
      data-tauri-drag-region
      className={`h-10 border-b ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg} flex items-center px-1 gap-1 overflow-x-auto select-none`}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {tabs.map((tab) => (
        <EditorTab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          t={t}
          tConfig={tConfig}
          onActivate={onActivate}
          onClose={onClose}
          onCloseOthers={onCloseOthers}
          onCloseRight={onCloseRight}
          onCloseSaved={onCloseSaved}
          onCloseAll={onCloseAll}
        />
      ))}
      <button
        onClick={onNewTab}
        title={t["file.new"] || "New file"}
        aria-label="new-tab"
        className={`h-8 w-8 shrink-0 rounded-md border ${tConfig.uiBorder} inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export default EditorTabs;
