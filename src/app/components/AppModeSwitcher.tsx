import type { AppMode } from "../../types";

interface AppModeSwitcherProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function AppModeSwitcher({ mode, onModeChange }: AppModeSwitcherProps) {
  return (
    <div className="flex items-center gap-0 rounded border" style={{ borderColor: "var(--ml-border, #374151)" }}>
      <button
        type="button"
        onClick={() => onModeChange("editor")}
        className="px-2.5 py-0.5 text-[11px] font-semibold rounded-l transition-colors"
        style={{
          color: mode === "editor" ? "var(--ml-bg, #ffffff)" : "var(--ml-fg, #d1d5db)",
          backgroundColor: mode === "editor" ? "var(--ml-accent, #6366f1)" : "transparent",
        }}
      >
        Editor
      </button>
      <button
        type="button"
        onClick={() => onModeChange("journal")}
        className="px-2.5 py-0.5 text-[11px] font-semibold rounded-r transition-colors"
        style={{
          color: mode === "journal" ? "var(--ml-bg, #ffffff)" : "var(--ml-fg, #d1d5db)",
          backgroundColor: mode === "journal" ? "var(--ml-accent, #6366f1)" : "transparent",
        }}
      >
        Diário
      </button>
    </div>
  );
}
