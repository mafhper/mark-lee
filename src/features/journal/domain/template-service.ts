import { createWorkspaceDirectory, deleteWorkspacePath, listDir, readFile, writeFile } from "../../../services/filesystem";

export interface JournalTemplate {
  name: string;
  body: string;
}

export const DEFAULT_TEMPLATES: JournalTemplate[] = [
  {
    name: "Daily log",
    body: "## Highlights\n\n- What went well today?\n- What could have been better?\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n\n## Mood\n\n",
  },
  {
    name: "Gratitude",
    body: "## Three things I'm grateful for\n\n1. \n2. \n3. \n\n## Why they matter\n\n\n## One good thing that happened today\n\n",
  },
  {
    name: "Week review",
    body: "## Wins this week\n\n- \n- \n- \n\n## Challenges\n\n- \n- \n\n## Next week focus\n\n- [ ] \n- [ ] \n- [ ] \n\n## Mood trend\n\n",
  },
  {
    name: "Tracker log",
    body: "## Today's metrics\n\n\n## Notes\n\n\n> Use trackers (Stats button) to log numeric, text, or boolean data for this entry.",
  },
  {
    name: "Travel journal",
    body: "## Location\n\n\n## Date\n\n\n## Highlights\n\n- \n- \n- \n\n## Photos\n\n\n## What I learned\n\n",
  },
];

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
    return [...DEFAULT_TEMPLATES];
  }
  const results: JournalTemplate[] = [];
  for (const item of items) {
    if (!item.endsWith(".md")) continue;
    const name = item.slice(0, -3);
    const body = await readFile(`${dir}/${item}`);
    results.push({ name, body });
  }
  if (results.length === 0) return [...DEFAULT_TEMPLATES];
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
