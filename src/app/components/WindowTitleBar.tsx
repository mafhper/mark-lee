import React, { useCallback } from "react";
import { Minus, Square, X } from "lucide-react";
import { isTauriRuntime } from "../../services/runtime";
import { ThemeConfig } from "../../types";

interface WindowTitleBarProps {
  tConfig: ThemeConfig;
}

const WindowTitleBar: React.FC<WindowTitleBarProps> = () => {
  const canControlWindow = isTauriRuntime() || (typeof window !== "undefined" && (window as any).DEBUG_SHOW_TITLEBAR);

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
        className="absolute top-0 left-0 right-[130px] h-[6px] pointer-events-auto"
        style={{ WebkitAppRegion: "drag", backgroundColor: "transparent" } as React.CSSProperties}
        data-tauri-drag-region="true"
      />

      <div
        className="flex h-8 items-center gap-0 pr-1 pointer-events-auto"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          type="button"
          title="Minimize"
          className="inline-flex h-8 w-11 items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
          onClick={() => runWindowAction("minimize")}
        >
          <Minus size={14} strokeWidth={1} />
        </button>
        <button
          type="button"
          title="Maximize"
          className="inline-flex h-8 w-11 items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
          onClick={() => runWindowAction("toggleMaximize")}
        >
          <Square size={11} strokeWidth={1} />
        </button>
        <button
          type="button"
          title="Close"
          className="inline-flex h-8 w-11 items-center justify-center transition-colors hover:bg-red-500 hover:text-white opacity-70 hover:opacity-100"
          onClick={() => runWindowAction("close")}
        >
          <X size={14} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
};

export default WindowTitleBar;
