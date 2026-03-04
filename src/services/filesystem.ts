import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { WorkspaceNode } from "../types";
import { isTauriRuntime } from "./runtime";

const USER_DATA_PREFIX = "mark-lee-user-data:";

function requireTauri(action: string) {
  if (!isTauriRuntime()) {
    throw new Error(`${action} is only available in desktop mode.`);
  }
}

export async function readFile(path: string): Promise<string> {
  requireTauri("Read file");
  return invoke("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  requireTauri("Write file");
  await invoke("write_file", { path, content });
}

export async function listDir(path: string): Promise<string[]> {
  requireTauri("List directory");
  return invoke("list_dir", { path });
}

export async function readWorkspaceTree(path: string): Promise<WorkspaceNode> {
  requireTauri("Read workspace tree");
  return invoke("read_workspace_tree", { path });
}

export async function createWorkspaceFile(path: string): Promise<void> {
  requireTauri("Create workspace file");
  await invoke("create_workspace_file", { path });
}

export async function createWorkspaceDirectory(path: string): Promise<void> {
  requireTauri("Create workspace directory");
  await invoke("create_workspace_directory", { path });
}

export async function renameWorkspacePath(oldPath: string, newPath: string): Promise<void> {
  requireTauri("Rename workspace path");
  await invoke("rename_workspace_path", { oldPath, newPath });
}

export async function deleteWorkspacePath(path: string): Promise<void> {
  requireTauri("Delete workspace path");
  await invoke("delete_workspace_path", { path });
}

export async function revealInFileManager(path: string): Promise<void> {
  requireTauri("Reveal in file manager");
  await invoke("reveal_in_file_manager", { path });
}

export async function getUserDataPath(): Promise<string> {
  if (!isTauriRuntime()) return "browser://localStorage";
  return invoke("get_user_data_path");
}

export async function readUserDataFile(fileName: string): Promise<string | null> {
  if (!isTauriRuntime()) return localStorage.getItem(`${USER_DATA_PREFIX}${fileName}`);
  return invoke("read_user_data_file", { fileName });
}

export async function writeUserDataFile(fileName: string, content: string): Promise<void> {
  if (!isTauriRuntime()) {
    localStorage.setItem(`${USER_DATA_PREFIX}${fileName}`, content);
    return;
  }
  await invoke("write_user_data_file", { fileName, content });
}

export async function copyImageToDocumentDir(
  imagePath: string,
  documentPath: string
): Promise<string> {
  requireTauri("Copy image");
  return invoke("copy_image_to_document_dir", { imagePath, documentPath });
}

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
  directory?: boolean;
}

const TEXT_FILE_EXTENSIONS = [
  "md",
  "markdown",
  "txt",
  "text",
  "log",
  "json",
  "jsonc",
  "yaml",
  "yml",
  "xml",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "sh",
  "bash",
  "ini",
  "cfg",
  "conf",
  "env",
];

export async function openFileDialog(options?: FileDialogOptions): Promise<string | string[] | null> {
  if (!isTauriRuntime()) return null;
  const selected = await open({
    multiple: options?.multiple ?? false,
    directory: options?.directory ?? false,
    defaultPath: options?.defaultPath,
    title: options?.title,
    filters:
      options?.filters ??
      [
        { name: "All Supported", extensions: TEXT_FILE_EXTENSIONS },
        { name: "Markdown", extensions: ["md", "markdown"] },
      ],
  });

  if (Array.isArray(selected)) {
    return selected.map((entry) => ((entry as any).path || entry) as string);
  }
  return selected ? (((selected as any).path || selected) as string) : null;
}

function ensureDefaultMd(name: string) {
  if (!name) return "Untitled.md";
  return /\.[a-z0-9]+$/i.test(name) ? name : `${name}.md`;
}

export async function saveFileDialog(currentName?: string): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const preparedName = ensureDefaultMd(currentName ?? "Untitled.md");
  const ext = preparedName.split(".").pop()?.toLowerCase() || "md";
  const primaryFilter =
    ext === "pdf"
      ? { name: "PDF", extensions: ["pdf"] }
      : ext === "html" || ext === "htm"
      ? { name: "HTML", extensions: ["html", "htm"] }
      : { name: "Markdown", extensions: ["md", "markdown"] };

  const selected = await save({
    defaultPath: preparedName,
    filters: [
      primaryFilter,
      { name: "Markdown", extensions: ["md", "markdown"] },
      { name: "HTML", extensions: ["html", "htm"] },
      { name: "PDF", extensions: ["pdf"] },
      { name: "Text", extensions: ["txt", "text", "log"] },
      { name: "JSON", extensions: ["json"] },
      { name: "TypeScript", extensions: ["ts", "tsx"] },
      { name: "JavaScript", extensions: ["js", "jsx"] },
      { name: "All Supported", extensions: TEXT_FILE_EXTENSIONS },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return selected ? (((selected as any).path || selected) as string) : null;
}
