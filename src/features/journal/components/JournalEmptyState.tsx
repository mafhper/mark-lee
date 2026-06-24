import React from "react";
import type { ThemeConfig } from "../../../types";

interface EmptyStateAction {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  primary?: boolean;
}

interface JournalEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tConfig: ThemeConfig;
  action?: { label: string; onSelect: () => void };
  actions?: EmptyStateAction[];
}

export function JournalEmptyState({ icon, title, description, tConfig, action, actions }: JournalEmptyStateProps) {
  const allActions: EmptyStateAction[] = [
    ...(actions ?? []),
    ...(action ? [{ label: action.label, onSelect: action.onSelect }] : []),
  ];
  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-4 px-8 py-12 text-center"
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
      {allActions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {allActions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:opacity-90"
              style={a.primary
                ? { color: "#fff", backgroundColor: tConfig.accentHex, borderColor: tConfig.accentHex }
                : { color: tConfig.accentHex, borderColor: tConfig.accentHex + "40", backgroundColor: tConfig.accentHex + "10" }}
              onClick={a.onSelect}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
