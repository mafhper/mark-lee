import React, { useCallback } from "react";
import { Minus, Square, X } from "lucide-react";
import { isTauriRuntime } from "../../services/runtime";
import { ThemeConfig } from "../../types";

interface WindowTitleBarProps {
  tConfig: ThemeConfig;
}

const WindowTitleBar: React.FC<WindowTitleBarProps> = () => {
  const canControlWindow = isTauriRuntime() || (typeof window !== "undefined" && (window as any).DEBUG_SHOW_TITLEBAR);
  const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;
  const windowControlClass =
    "ml-window-control inline-flex h-8 w-12 shrink-0 items-center justify-center transition-colors opacity-70 hover:opacity-100";

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

  if (!canControlWindow) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[300] flex justify-end pointer-events-none"
    >
      <div
        className="absolute top-0 left-0 right-[144px] h-[6px] pointer-events-auto"
        style={{ WebkitAppRegion: "drag", backgroundColor: "transparent" } as React.CSSProperties}
        data-tauri-drag-region="true"
      />

      <div
        className="flex h-8 items-center gap-0 pointer-events-auto"
        style={noDragStyle}
      >
        <button
          type="button"
          aria-label="Minimize window"
          title="Minimize"
          className={`${windowControlClass} hover:bg-black/10 dark:hover:bg-white/10`}
          style={noDragStyle}
          data-window-control="minimize"
          onClick={() => runWindowAction("minimize")}
        >
          <Minus size={14} strokeWidth={1} />
        </button>
        <button
          type="button"
          aria-label="Maximize window"
          title="Maximize"
          className={`${windowControlClass} hover:bg-black/10 dark:hover:bg-white/10`}
          style={noDragStyle}
          data-window-control="maximize"
          onClick={() => runWindowAction("toggleMaximize")}
        >
          <Square size={11} strokeWidth={1} />
        </button>
        <button
          type="button"
          aria-label="Close window"
          title="Close"
          className={`${windowControlClass} hover:bg-red-500 hover:text-white`}
          style={noDragStyle}
          data-window-control="close"
          onClick={() => runWindowAction("close")}
        >
          <X size={14} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
};

export default WindowTitleBar;
