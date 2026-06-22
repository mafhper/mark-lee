import assert from "node:assert/strict";
import test from "node:test";

type CommandId =
  | "file.new"
  | "file.open"
  | "file.openFolder"
  | "file.save"
  | "edit.find";

type CommandSurface = "palette" | "shortcut";

interface AppCommand {
  id: CommandId;
  labelKey: string;
  shortcutId?: string;
  surfaces: readonly CommandSurface[];
  palette?: {
    sectionKey: string;
    keywords: readonly string[];
  };
  execute(): void | Promise<void>;
}

interface AppCommandDependencies {
  newFile(): void;
  openFile(): void | Promise<void>;
  openFolder(): void | Promise<void>;
  saveFile(forceSaveAs: boolean): void | Promise<void>;
  openFind(): void;
}

function createAppCommands(deps: AppCommandDependencies): AppCommand[] {
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

const VALID_SHORTCUT_IDS = new Set([
  "file-new",
  "file-open",
  "file-open-folder",
  "file-save",
  "file-save-as",
  "file-export",
  "file-print",
  "edit-undo",
  "edit-redo",
  "edit-find",
  "edit-replace",
  "edit-snippets",
  "view-edit",
  "view-split",
  "view-preview",
  "view-zen",
  "view-toolbar",
  "view-sidebar",
  "help-shortcuts",
  "view-theme-cycle",
  "app-settings",
  "app-command-palette",
  "fmt-bold",
  "fmt-italic",
  "fmt-link",
  "fmt-ul",
  "fmt-ol",
  "fmt-task",
]);

const SHORTCUT_MAP: Record<string, string> = {
  "file-new": "Ctrl+N",
  "file-open": "Ctrl+O",
  "file-open-folder": "Ctrl+Shift+O",
  "file-save": "Ctrl+S",
  "file-save-as": "Ctrl+Shift+S",
  "file-export": "Ctrl+E",
  "edit-find": "Ctrl+F",
  "edit-replace": "Ctrl+H",
  "edit-snippets": "Ctrl+J",
  "view-edit": "Ctrl+1",
  "view-split": "Ctrl+2",
  "view-preview": "Ctrl+3",
  "view-zen": "F10",
  "view-sidebar": "Ctrl+B",
  "view-theme-cycle": "Ctrl+Shift+T",
  "app-settings": "Ctrl+,",
  "app-command-palette": "Ctrl+P",
  "fmt-bold": "Ctrl+Shift+B",
  "fmt-italic": "Ctrl+I",
  "fmt-link": "Ctrl+K",
  "fmt-ul": "Ctrl+Shift+8",
  "fmt-ol": "Ctrl+Shift+7",
  "fmt-task": "Ctrl+Shift+9",
};

function resolveCommandShortcut(
  shortcutId: string | undefined,
  customShortcuts: Record<string, string> | undefined
): string | undefined {
  if (!shortcutId) return undefined;
  return customShortcuts?.[shortcutId] ?? SHORTCUT_MAP[shortcutId];
}

function createMockDependencies(): AppCommandDependencies & { _calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {};
  return {
    newFile() {
      calls["newFile"] = (calls["newFile"] || []).concat([[]]);
    },
    openFile() {
      calls["openFile"] = (calls["openFile"] || []).concat([[]]);
    },
    openFolder() {
      calls["openFolder"] = (calls["openFolder"] || []).concat([[]]);
    },
    saveFile(forceSaveAs: boolean) {
      calls["saveFile"] = (calls["saveFile"] || []).concat([[forceSaveAs]]);
    },
    openFind() {
      calls["openFind"] = (calls["openFind"] || []).concat([[]]);
    },
    _calls: calls,
  } as AppCommandDependencies & { _calls: Record<string, unknown[][]> };
}

test("creates exactly 5 commands", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  assert.equal(commands.length, 5);
});

test("all command IDs are unique", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  const ids = commands.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("shortcutId references a valid shortcut key", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  for (const cmd of commands) {
    if (cmd.shortcutId) {
      assert.ok(
        VALID_SHORTCUT_IDS.has(cmd.shortcutId),
        `shortcutId "${cmd.shortcutId}" is not a recognized shortcut key`
      );
    }
  }
});

test("commands with surface palette have palette metadata", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  for (const cmd of commands) {
    if (cmd.surfaces.includes("palette")) {
      assert.ok(cmd.palette, `command ${cmd.id} is missing palette metadata`);
      assert.ok(cmd.palette!.sectionKey, `command ${cmd.id} is missing sectionKey`);
      assert.ok(Array.isArray(cmd.palette!.keywords), `command ${cmd.id} keywords is not an array`);
    }
  }
});

test("file.new calls newFile", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  const cmd = commands.find((c) => c.id === "file.new")!;
  cmd.execute();
  assert.equal(deps._calls["newFile"]?.length, 1);
});

test("file.open calls openFile", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  const cmd = commands.find((c) => c.id === "file.open")!;
  cmd.execute();
  assert.equal(deps._calls["openFile"]?.length, 1);
});

test("file.openFolder calls openFolder", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  const cmd = commands.find((c) => c.id === "file.openFolder")!;
  cmd.execute();
  assert.equal(deps._calls["openFolder"]?.length, 1);
});

test("file.save calls saveFile with false", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  const cmd = commands.find((c) => c.id === "file.save")!;
  cmd.execute();
  assert.equal(deps._calls["saveFile"]?.length, 1);
  assert.equal(deps._calls["saveFile"][0][0], false);
});

test("edit.find calls openFind", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);
  const cmd = commands.find((c) => c.id === "edit.find")!;
  cmd.execute();
  assert.equal(deps._calls["openFind"]?.length, 1);
});

test("resolveCommandShortcut prefers customShortcuts over default", () => {
  const custom = { "file-save": "Ctrl+Alt+S" };
  const result = resolveCommandShortcut("file-save", custom);
  assert.equal(result, "Ctrl+Alt+S");
});

test("resolveCommandShortcut falls back for undefined customShortcuts", () => {
  const result = resolveCommandShortcut("file-save", undefined);
  assert.equal(result, "Ctrl+S");
});

test("resolveCommandShortcut returns undefined for missing shortcutId", () => {
  const result = resolveCommandShortcut(undefined, {});
  assert.equal(result, undefined);
});

test("no shortcut collisions among registered commands", () => {
  const deps = createMockDependencies();
  const commands = createAppCommands(deps as AppCommandDependencies);

  const shortcuts = commands
    .filter((cmd) => cmd.shortcutId && cmd.surfaces.includes("shortcut"))
    .map((cmd) => SHORTCUT_MAP[cmd.shortcutId!].trim().toUpperCase());

  assert.equal(new Set(shortcuts).size, shortcuts.length, "duplicate shortcut found");
});
