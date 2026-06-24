import type { CommandPaletteItem } from "../components/CommandPaletteModal";
import type { AppCommand } from "./command.types";
import { resolveCommandShortcut } from "./resolveCommandShortcut";

interface ToCommandPaletteItemsOptions {
  t: Record<string, string>;
  customShortcuts: Record<string, string> | undefined;
}

export function toCommandPaletteItems(
  commands: readonly AppCommand[],
  options: ToCommandPaletteItemsOptions
): CommandPaletteItem[] {
  return commands
    .filter((cmd) => cmd.surfaces.includes("palette"))
    .map((cmd) => ({
      id: `palette-${cmd.id.replace(/\./g, "-")}`,
      label: options.t[cmd.labelKey] || cmd.id,
      section: options.t[cmd.palette!.sectionKey] || "",
      kind: "action" as const,
      hint: resolveCommandShortcut(cmd.shortcutId, options.customShortcuts),
      keywords: cmd.palette!.keywords.join(" "),
      onSelect: () => void cmd.execute(),
    }));
}
