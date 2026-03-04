import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { DocumentTab, ThemeConfig } from "../../types";

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
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  return (
    <div
      className={`h-10 border-b ${tConfig.uiBorder} ${tConfig.ui} ${tConfig.fg} flex items-center px-1 gap-1 overflow-x-auto`}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onActivate(tab.id)}
          onContextMenu={(event) => {
            event.preventDefault();
            setContextTabId(tab.id);
            setMenuPosition({ x: event.clientX, y: event.clientY });
          }}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border ${
            tab.id === activeTabId
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
          {contextTabId === tab.id && (
            <div
              className={`fixed z-[120] min-w-[180px] rounded-md border shadow-xl ${tConfig.ui} ${tConfig.uiBorder}`}
              style={{ top: menuPosition.y, left: menuPosition.x }}
            >
              <button
                className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  onClose(tab.id);
                  setContextTabId(null);
                }}
              >
                {t["tabs.close"] || "Close"}
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  onCloseOthers(tab.id);
                  setContextTabId(null);
                }}
              >
                {t["tabs.closeOthers"] || "Close Others"}
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  onCloseRight(tab.id);
                  setContextTabId(null);
                }}
              >
                {t["tabs.closeRight"] || "Close to the Right"}
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  onCloseSaved();
                  setContextTabId(null);
                }}
              >
                {t["tabs.closeSaved"] || "Close Saved"}
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  onCloseAll();
                  setContextTabId(null);
                }}
              >
                {t["tabs.closeAll"] || "Close All"}
              </button>
            </div>
          )}
        </button>
      ))}
      <button
        onClick={onNewTab}
        title={t["file.new"] || "New file"}
        aria-label="new-tab"
        className={`h-8 w-8 shrink-0 rounded-md border ${tConfig.uiBorder} inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10`}
      >
        <Plus size={14} />
      </button>
      {contextTabId && (
        <button
          className="fixed inset-0 z-[110] cursor-default"
          onClick={() => setContextTabId(null)}
          aria-label="close-tab-menu"
        />
      )}
    </div>
  );
};

export default EditorTabs;
