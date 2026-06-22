import { createWorkspaceDirectory, deleteWorkspacePath, listDir, readFile, writeFile } from "../../../services/filesystem";

export interface JournalTemplate {
  name: string;
  body: string;
}

function templatesDir(journalRoot: string): string {
  return `${journalRoot}/templates`;
}

function templatePath(journalRoot: string, name: string): string {
  return `${templatesDir(journalRoot)}/${name}.md`;
}

export async function listTemplates(journalRoot: string): Promise<JournalTemplate[]> {
  const dir = templatesDir(journalRoot);
  let items: string[];
  try {
    items = await listDir(dir);
  } catch {
    return [];
  }
  const results: JournalTemplate[] = [];
  for (const item of items) {
    if (!item.endsWith(".md")) continue;
    const name = item.slice(0, -3);
    const body = await readFile(`${dir}/${item}`);
    results.push({ name, body });
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function readTemplate(journalRoot: string, name: string): Promise<JournalTemplate | null> {
  try {
    const body = await readFile(templatePath(journalRoot, name));
    return { name, body };
  } catch {
    return null;
  }
}

export async function saveTemplate(journalRoot: string, name: string, body: string): Promise<void> {
  const dir = templatesDir(journalRoot);
  await createWorkspaceDirectory(dir);
  await writeFile(templatePath(journalRoot, name), body);
}

export async function deleteTemplate(journalRoot: string, name: string): Promise<void> {
  await deleteWorkspacePath(templatePath(journalRoot, name));
}

export function getExcerpt(body: string, maxLength = 100): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
