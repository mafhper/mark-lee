import type { AppCommand, AppCommandDependencies } from "./command.types";

export function createAppCommands(deps: AppCommandDependencies): AppCommand[] {
  return [
    {
      id: "file.new",
      labelKey: "file.new",
      shortcutId: "file-new",
      surfaces: ["palette", "shortcut"],
      palette: {
        sectionKey: "palette.group.actions",
        keywords: ["new", "file", "tab", "untitled"],
      },
      execute: deps.newFile,
    },
    {
      id: "file.open",
      labelKey: "file.open",
      shortcutId: "file-open",
      surfaces: ["palette", "shortcut"],
      palette: {
        sectionKey: "palette.group.actions",
        keywords: ["open", "file", "picker"],
      },
      execute: deps.openFile,
    },
    {
      id: "file.openFolder",
      labelKey: "file.openFolder",
      shortcutId: "file-open-folder",
      surfaces: ["palette", "shortcut"],
      palette: {
        sectionKey: "palette.group.actions",
        keywords: ["open", "folder", "workspace"],
      },
      execute: deps.openFolder,
    },
    {
      id: "file.save",
      labelKey: "file.save",
      shortcutId: "file-save",
      surfaces: ["palette", "shortcut"],
      palette: {
        sectionKey: "palette.group.actions",
        keywords: ["save", "file"],
      },
      execute: () => deps.saveFile(false),
    },
    {
      id: "edit.find",
      labelKey: "edit.find",
      shortcutId: "edit-find",
      surfaces: ["palette", "shortcut"],
      palette: {
        sectionKey: "palette.group.actions",
        keywords: ["find", "replace", "search"],
      },
      execute: deps.openFind,
    },
  ];
}
