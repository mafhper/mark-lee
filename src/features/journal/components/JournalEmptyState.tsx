import React from "react";
import type { ThemeConfig } from "../../../types";

interface JournalEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tConfig: ThemeConfig;
  action?: { label: string; onSelect: () => void };
}

export function JournalEmptyState({ icon, title, description, tConfig, action }: JournalEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 px-8 py-12 text-center"
      style={{ color: tConfig.fgHex + "80" }}
    >
      <div className="opacity-40">{icon}</div>
      <div className="space-y-2 max-w-xs">
        <h3 className="text-base font-semibold" style={{ color: tConfig.fgHex }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: tConfig.fgHex + "90" }}>
          {description}
        </p>
      </div>
      {action && (
        <button
          type="button"
          className="mt-2 px-4 py-1.5 text-sm font-medium rounded border transition-colors"
          style={{
            color: tConfig.accentHex,
            borderColor: tConfig.accentHex + "40",
            backgroundColor: tConfig.accentHex + "10",
          }}
          onClick={action.onSelect}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
