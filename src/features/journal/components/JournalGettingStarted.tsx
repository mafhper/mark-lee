import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, FolderPlus, PenLine, Plus } from "lucide-react";
import type { ThemeConfig } from "../../../types";
import type { JournalTemplate } from "../domain/template-service";
import { DEFAULT_TEMPLATES, getExcerpt, listTemplates } from "../domain/template-service";

interface JournalGettingStartedProps {
  t: Record<string, string>;
  tConfig: ThemeConfig;
  hasEntries: boolean;
  hasJournal?: boolean;
  journalRootPath?: string;
  journalName?: string;
  backgroundUrl?: string | null;
  onNewEntry: () => void;
  onCreateFromTemplate?: (templateBody: string) => void;
  onCreateJournal?: () => void;
  onAddJournal?: () => void;
}

const DEFAULT_TEMPLATE_KEYS: Record<string, string> = {
  "Daily log": "daily",
  Gratitude: "gratitude",
  "Week review": "week",
  "Tracker log": "tracker",
  "Travel journal": "travel",
};

function templateTitle(template: JournalTemplate, t: Record<string, string>) {
  const key = DEFAULT_TEMPLATE_KEYS[template.name];
  return key ? (t[`journal.template.${key}`] || template.name) : template.name;
}

function templateDescription(template: JournalTemplate, t: Record<string, string>) {
  const key = DEFAULT_TEMPLATE_KEYS[template.name];
  if (key && t[`journal.template.${key}.desc`]) return t[`journal.template.${key}.desc`];
  return getExcerpt(template.body.replace(/[#>*`-]/g, "").replace(/\n+/g, " "), 92) || (t["journal.templateDefaultDesc"] || "Modelo de registro");
}

export function JournalGettingStarted({
  t, tConfig, hasEntries, hasJournal = true, journalRootPath, journalName, backgroundUrl,
  onNewEntry, onCreateFromTemplate, onCreateJournal, onAddJournal,
}: JournalGettingStartedProps) {
  const [templates, setTemplates] = useState<JournalTemplate[]>(DEFAULT_TEMPLATES);

  useEffect(() => {
    let active = true;
    if (!hasJournal || !journalRootPath) return () => { active = false; };
    listTemplates(journalRootPath)
      .then((list) => { if (active) setTemplates(list); })
      .catch(() => { if (active) setTemplates(DEFAULT_TEMPLATES); });
    return () => { active = false; };
  }, [hasJournal, journalRootPath]);

  const cards = useMemo(() => [
    {
      key: "blank",
      title: t["journal.blankEntry"] || "Em branco",
      body: t["journal.blankEntryDesc"] || "Comecar do zero",
      icon: <Plus size={16} />,
      templateBody: "",
      primary: true,
    },
    ...templates.slice(0, 5).map((template) => ({
      key: template.name,
      title: templateTitle(template, t),
      body: templateDescription(template, t),
      icon: <FileText size={16} />,
      templateBody: template.body,
      primary: false,
    })),
  ], [t, templates]);

  const createFrom = (body: string) => {
    if (onCreateFromTemplate) {
      onCreateFromTemplate(body);
      return;
    }
    onNewEntry();
  };

  const title = !hasJournal
    ? (t["journal.noJournalTitle"] || "Nenhum caderno aberto")
    : hasEntries
      ? (t["journal.startPageTitle"] || "Escolha um registro ou comece outro")
      : (t["journal.createFirstEntry"] || "Criar seu primeiro registro");
  const description = !hasJournal
    ? (t["journal.noJournalDesc"] || "Crie ou adicione um caderno para comecar a registrar.")
    : hasEntries
      ? (t["journal.startPageDesc"] || "Use um modelo rapido ou selecione uma memoria na lista.")
      : (t["journal.emptyStateEntries"] || "Nenhum registro ainda. Comece com um modelo.");

  return (
    <div className="relative flex-1 overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none">
        {backgroundUrl ? (
          <img src={backgroundUrl} alt="" className="h-full w-full object-cover opacity-40" />
        ) : (
          <div className="h-full w-full"
            style={{ background: `radial-gradient(circle at 22% 18%, ${tConfig.accentHex}24, transparent 32%), linear-gradient(145deg, ${tConfig.accentHex}16, ${tConfig.editorBgHex})` }} />
        )}
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${tConfig.editorBgHex}E8 0%, ${tConfig.editorBgHex}C8 38%, ${tConfig.editorBgHex}F6 100%)` }} />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-7 px-6 py-10">
        <div className="max-w-2xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: tConfig.accentHex + "18", color: tConfig.accentHex }}>
            <BookOpen size={24} />
          </div>
          {journalName && hasJournal && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: tConfig.fgHex + "68" }}>
              {journalName}
            </p>
          )}
          <h2 className="text-3xl font-bold leading-tight tracking-tight" style={{ color: tConfig.fgHex }}>
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: tConfig.fgHex + "78" }}>
            {description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {hasJournal ? (
              <button type="button" onClick={onNewEntry}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
                <PenLine size={16} />
                {t["journal.newEntry"] || "Novo registro"}
              </button>
            ) : (
              <>
                {onCreateJournal && (
                  <button type="button" onClick={onCreateJournal}
                    className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ color: "#fff", backgroundColor: tConfig.accentHex }}>
                    <PenLine size={16} />
                    {t["journal.newJournal"] || "Novo caderno"}
                  </button>
                )}
                {onAddJournal && (
                  <button type="button" onClick={onAddJournal}
                    className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ color: tConfig.fgHex, borderColor: tConfig.uiBorderHex }}>
                    <FolderPlus size={16} />
                    {t["journal.addJournal"] || "Adicionar caderno"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {hasJournal && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: tConfig.fgHex + "60" }}>
              {t["journal.entryModels"] || "Modelos de registro"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <button key={card.key} type="button" onClick={() => createFrom(card.templateBody)}
                  className="min-h-[112px] rounded-lg border p-3 text-left transition-transform hover:-translate-y-0.5"
                  style={{
                    borderColor: card.primary ? tConfig.accentHex + "55" : tConfig.uiBorderHex,
                    backgroundColor: card.primary ? tConfig.accentHex + "12" : tConfig.uiHex + "E6",
                    color: tConfig.fgHex,
                  }}>
                  <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-md"
                    style={{ backgroundColor: card.primary ? tConfig.accentHex + "24" : tConfig.fgHex + "0E", color: card.primary ? tConfig.accentHex : tConfig.fgHex + "75" }}>
                    {card.icon}
                  </span>
                  <span className="block text-sm font-semibold">{card.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed" style={{ color: tConfig.fgHex + "68" }}>{card.body}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
