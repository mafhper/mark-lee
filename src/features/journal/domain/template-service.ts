import { createWorkspaceDirectory, deleteWorkspacePath, listDir, readFile, writeFile } from "../../../services/filesystem";
import { readManifest, setTemplatePreferences } from "./manifest-service";

export interface JournalTemplate {
  id: string;
  name: string;
  body: string;
  description?: string;
  builtIn?: boolean;
  hidden?: boolean;
}

export const DEFAULT_TEMPLATES: JournalTemplate[] = [
  {
    id: "daily-log",
    name: "Daily log",
    description: "Daily highlights, tasks, notes, and mood.",
    builtIn: true,
    body: "## Highlights\n\n- What went well today?\n- What could have been better?\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n\n## Mood\n\n",
  },
  {
    id: "gratitude",
    name: "Gratitude",
    description: "A short reflection format for gratitude entries.",
    builtIn: true,
    body: "## Three things I'm grateful for\n\n1. \n2. \n3. \n\n## Why they matter\n\n\n## One good thing that happened today\n\n",
  },
  {
    id: "week-review",
    name: "Week review",
    description: "Review wins, challenges, and next-week focus.",
    builtIn: true,
    body: "## Wins this week\n\n- \n- \n- \n\n## Challenges\n\n- \n- \n\n## Next week focus\n\n- [ ] \n- [ ] \n- [ ] \n\n## Mood trend\n\n",
  },
  {
    id: "tracker-log",
    name: "Tracker log",
    description: "A lightweight note around measured tracker values.",
    builtIn: true,
    body: "## Today's metrics\n\n\n## Notes\n\n\n> Use trackers (Stats button) to log numeric, text, or boolean data for this entry.",
  },
  {
    id: "travel-journal",
    name: "Travel journal",
    description: "Travel notes with location, photos, and learnings.",
    builtIn: true,
    body: "## Location\n\n\n## Date\n\n\n## Highlights\n\n- \n- \n- \n\n## Photos\n\n\n## What I learned\n\n",
  },
  {
    id: "dev-github-profile",
    name: "Perfil GitHub",
    description: "Resumo de repositório, identidade técnica e links úteis.",
    builtIn: true,
    body: "## Perfil\n\n- GitHub: \n- Stack principal: \n- Repositórios relevantes: \n\n## Bio curta\n\n\n## Destaques\n\n- \n- \n- \n\n## Links\n\n- \n",
  },
  {
    id: "dev-app-readme",
    name: "README de aplicação",
    description: "Estrutura inicial para documentar um app.",
    builtIn: true,
    body: "# Nome da aplicação\n\n## O que é\n\n\n## Como executar\n\n```bash\nnpm install\nnpm run dev\n```\n\n## Estrutura\n\n- \n\n## Validação\n\n- [ ] Build\n- [ ] Testes\n- [ ] Smoke manual\n",
  },
  {
    id: "dev-correction-note",
    name: "Nota de correção",
    description: "Registro objetivo de problema, causa e correção.",
    builtIn: true,
    body: "## Problema\n\n\n## Causa provável\n\n\n## Correção proposta\n\n- \n\n## Arquivos afetados\n\n- \n\n## Validação\n\n- [ ] \n",
  },
  {
    id: "dev-implementation-suggestion",
    name: "Sugestão de implementação",
    description: "Ideia técnica com passos e riscos.",
    builtIn: true,
    body: "## Objetivo\n\n\n## Abordagem\n\n1. \n2. \n3. \n\n## Tradeoffs\n\n- \n\n## Riscos\n\n- \n\n## Gate mínimo\n\n- [ ] \n",
  },
  {
    id: "dev-reference-idea",
    name: "Ideia com referência",
    description: "Ideia derivada de uma referência externa.",
    builtIn: true,
    body: "## Ideia\n\n\n## Referência\n\n\n## O que aproveitar\n\n- \n\n## O que evitar\n\n- \n\n## Próximo passo\n\n- [ ] \n",
  },
  {
    id: "dev-bug-report",
    name: "Bug report",
    description: "Passos, esperado, atual e contexto técnico.",
    builtIn: true,
    body: "## Contexto\n\n\n## Passos para reproduzir\n\n1. \n2. \n3. \n\n## Esperado\n\n\n## Atual\n\n\n## Evidências\n\n- \n\n## Ambiente\n\n- OS: \n- Versão: \n",
  },
  {
    id: "dev-technical-decision",
    name: "Decisão técnica",
    description: "Registro curto de decisão, alternativas e rollback.",
    builtIn: true,
    body: "## Problema\n\n\n## Restrições\n\n- \n\n## Opções consideradas\n\n1. \n2. \n\n## Decisão\n\n\n## Racional\n\n\n## Custo de manutenção\n\n\n## Rollback\n\n\n## Validação mínima\n\n- [ ] \n",
  },
];

function templatesDir(journalRoot: string): string {
  return `${journalRoot}/templates`;
}

function templatePath(journalRoot: string, name: string): string {
  return `${templatesDir(journalRoot)}/${name}.md`;
}

export async function listTemplates(
  journalRoot: string,
  options: { includeHiddenBuiltIns?: boolean } = {},
): Promise<JournalTemplate[]> {
  const manifest = journalRoot ? await readManifest(journalRoot).catch(() => null) : null;
  const hiddenBuiltIns = new Set(manifest?.templatePreferences?.hiddenBuiltInIds ?? []);
  const builtIns = DEFAULT_TEMPLATES
    .map((tpl) => ({ ...tpl, hidden: hiddenBuiltIns.has(tpl.id) }))
    .filter((tpl) => options.includeHiddenBuiltIns || !tpl.hidden);
  const dir = templatesDir(journalRoot);
  let items: string[];
  try {
    items = await listDir(dir);
  } catch {
    return builtIns;
  }
  const results: JournalTemplate[] = [];
  for (const item of items) {
    if (!item.endsWith(".md")) continue;
    const name = item.slice(0, -3);
    const body = await readFile(`${dir}/${item}`);
    results.push({ id: `custom:${name}`, name, body, builtIn: false });
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return [...builtIns, ...results];
}

export async function readTemplate(journalRoot: string, name: string): Promise<JournalTemplate | null> {
  try {
    const body = await readFile(templatePath(journalRoot, name));
    return { id: `custom:${name}`, name, body, builtIn: false };
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

export async function setBuiltInTemplateHidden(journalRoot: string, id: string, hidden: boolean): Promise<void> {
  const manifest = await readManifest(journalRoot);
  const current = new Set(manifest?.templatePreferences?.hiddenBuiltInIds ?? []);
  if (hidden) current.add(id);
  else current.delete(id);
  await setTemplatePreferences(journalRoot, { version: 1, hiddenBuiltInIds: Array.from(current) });
}

export function getExcerpt(body: string, maxLength = 100): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
