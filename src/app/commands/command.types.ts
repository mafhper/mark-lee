import type { ShortcutId } from "../../constants";

export type { ShortcutId };

export type CommandId =
  | "file.new"
  | "file.open"
  | "file.openFolder"
  | "file.save"
  | "edit.find";

export type CommandSurface = "palette" | "shortcut";

export interface AppCommand {
  id: CommandId;
  labelKey: string;
  shortcutId?: ShortcutId;
  surfaces: readonly CommandSurface[];
  palette?: {
    sectionKey: string;
    keywords: readonly string[];
  };
  execute(): void | Promise<void>;
}

export interface AppCommandDependencies {
  newFile(): void;
  openFile(): void | Promise<void>;
  openFolder(): void | Promise<void>;
  saveFile(forceSaveAs: boolean): void | Promise<void>;
  openFind(): void;
}
