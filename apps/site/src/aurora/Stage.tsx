import { CSSProperties, ReactNode, useState } from "react";
import SectionHead from "@/aurora/SectionHead";
import { APP_METRICS, STAGE_APP_THEME } from "@/aurora/app-metrics";
import { RECENT_RECORDS, RECORD, RECORD_SOURCE_LINES, RECORD_TREE, recordWordCount } from "@/aurora/demo";
import { formatRecordDate, formatRecordDay, formatRecordMonth } from "@/aurora/record-format";
import { fadeToken } from "@/aurora/theme-tokens";
import { Locale, SiteCopy, StageView, getCopy } from "@/i18n";

type StageChrome = SiteCopy["pages"]["home"]["stage"]["chrome"];

/* ---------------------------------------------------------------------------
 * Tokens da janela
 *
 * Sete cores, todas de `THEMES`: nada aqui e escolhido a dedo. O tema e o
 * Midnight, o mesmo que abre a secao de temas.
 * ------------------------------------------------------------------------ */

const APP = STAGE_APP_THEME;

const UI = APP.uiHex;
const BG = APP.bgHex;
const FG = APP.fgHex;
const BORDER = APP.uiBorderHex;
const EDITOR_BG = APP.editorBgHex;
const EDITOR_FG = APP.editorFgHex;
const ACCENT = APP.accentHex;

const CHROME_TEXT = fadeToken(FG, UI, 84);
const CHROME_DIM = fadeToken(FG, UI, 58);
const BODY_TEXT = fadeToken(FG, BG, 80);
const BODY_DIM = fadeToken(FG, BG, 58);
const GUTTER = fadeToken(EDITOR_FG, EDITOR_BG, 40);
const ACTIVE_LINE = fadeToken(EDITOR_FG, EDITOR_BG, 7);

/* ---------------------------------------------------------------------------
 * Texto do arquivo
 *
 * O tom de cada trecho vem de uma leitura propria do Markdown, nao de uma
 * lista escrita a mao: o mesmo tokenizador serve o painel de codigo do Editor
 * e a vista do arquivo cru.
 * ------------------------------------------------------------------------ */

type Tone = "text" | "accent" | "heading" | "muted";

const TONE_STYLE: Record<Tone, CSSProperties> = {
  text: { color: EDITOR_FG },
  accent: { color: ACCENT },
  heading: { color: EDITOR_FG, fontWeight: 700 },
  muted: { color: fadeToken(EDITOR_FG, EDITOR_BG, 62) },
};

interface Segment {
  text: string;
  tone: Tone;
}

const splitLine = (line: string, insideFrontMatter: boolean): Segment[] => {
  if (line === "---") return [{ text: line, tone: "accent" }];

  const heading = /^(#{1,6})\s+/.exec(line);
  if (heading) {
    return [
      { text: heading[1], tone: "accent" },
      { text: line.slice(heading[1].length), tone: "heading" },
    ];
  }

  if (insideFrontMatter) {
    const pair = /^([\w.-]+):(.*)$/.exec(line);
    if (pair) return [{ text: `${pair[1]}:`, tone: "muted" }, { text: pair[2], tone: "text" }];
  }

  const bullet = /^(\s*-\s+)(.*)$/.exec(line);
  if (bullet) return [{ text: bullet[1], tone: "accent" }, { text: bullet[2], tone: "text" }];

  return [{ text: line, tone: "text" }];
};

const tokenizeSource = (lines: string[]): Segment[][] => {
  let fences = 0;
  return lines.map((line) => {
    if (line === "---") fences += 1;
    return splitLine(line, fences === 1);
  });
};

const SOURCE_SEGMENTS = tokenizeSource(RECORD_SOURCE_LINES);
const WORD_COUNT = recordWordCount(RECORD);

/* ---------------------------------------------------------------------------
 * Pecas da janela
 * ------------------------------------------------------------------------ */

const ChromeItem = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    className="grid shrink-0 place-items-center rounded-[3px] text-[0.8rem] leading-none"
    style={{ width: APP_METRICS.controlSize, height: APP_METRICS.controlSize, color: CHROME_DIM }}
  >
    {children}
  </span>
);

interface AppBarProps {
  mode: "editor" | "memories";
  chrome: StageChrome;
  modeNames: [string, string];
}

/**
 * Barra do topo: 32px, medida na captura (borda em y=32). O aplicativo junta
 * numa linha so a marca, os menus, a barra de formatacao, o seletor de modo e
 * os controles da janela — a decoracao do sistema operacional nao entra na
 * captura, entao nao existe uma "linha de titulo" separada para desenhar.
 */
const AppBar = ({ mode, chrome, modeNames }: AppBarProps) => (
  <div
    className="flex shrink-0 items-center gap-2 px-2"
    style={{ height: APP_METRICS.barHeight, backgroundColor: UI, borderBottom: `1px solid ${BORDER}` }}
  >
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-[3px] font-heading text-[0.7rem]"
      style={{
        width: APP_METRICS.brandTileSize,
        height: APP_METRICS.brandTileSize,
        backgroundColor: FG,
        color: BG,
      }}
    >
      M
    </span>
    <span className="hidden shrink-0 text-[0.8125rem] font-semibold sm:block" style={{ color: FG }}>
      Mark-Lee
    </span>
    <span className="ml-1.5 hidden items-center gap-3 text-[0.8125rem] sm:flex" style={{ color: CHROME_TEXT }}>
      {chrome.menus.map((menu) => (
        <span key={menu}>{menu}</span>
      ))}
    </span>

    <div aria-hidden="true" className="flex flex-1 items-center justify-center gap-4 text-[0.8125rem]">
      {["B", "I", "</>", "↗", "▧", "▦", "☰"].map((glyph) => (
        <span key={glyph} className="hidden lg:inline" style={{ color: CHROME_DIM }}>
          {glyph}
        </span>
      ))}
    </div>

    <span className="flex shrink-0 items-center gap-1">
      {(["editor", "memories"] as const).map((id, index) => (
        <span
          key={id}
          className="rounded-[3px] px-2 py-[3px] text-[0.7rem] font-semibold"
          style={
            id === mode
              ? { backgroundColor: BG, color: FG, border: `1px solid ${BORDER}` }
              : { color: CHROME_DIM }
          }
        >
          {modeNames[index]}
        </span>
      ))}
    </span>

    <span aria-hidden="true" className="ml-1.5 flex shrink-0 items-center gap-2.5 text-[0.75rem]" style={{ color: CHROME_DIM }}>
      <span>—</span>
      <span>▢</span>
      <span>×</span>
    </span>
  </div>
);

const TabStrip = () => (
  <div
    className="flex shrink-0 items-stretch"
    style={{ height: APP_METRICS.tabStripHeight, backgroundColor: UI, borderBottom: `1px solid ${BORDER}` }}
  >
    <div
      className="hidden items-center gap-0.5 px-1.5 md:flex"
      style={{ width: APP_METRICS.editorSidebarWidth, borderRight: `1px solid ${BORDER}` }}
    >
      <ChromeItem>▤</ChromeItem>
      <ChromeItem>⊞</ChromeItem>
      <ChromeItem>▣</ChromeItem>
      <span className="ml-auto" />
      <ChromeItem>⇤</ChromeItem>
    </div>
    <div className="hidden items-center gap-0.5 px-1.5 sm:flex">
      <ChromeItem>◧</ChromeItem>
      <ChromeItem>⌕</ChromeItem>
    </div>
    <div className="flex min-w-0 flex-1 items-end gap-1 px-1">
      <span
        className="flex min-w-0 max-w-[13rem] items-center gap-2 rounded-t-[3px] px-2.5"
        style={{
          height: APP_METRICS.tabHeight,
          backgroundColor: BG,
          border: `1px solid ${BORDER}`,
          borderBottom: "none",
          color: FG,
        }}
      >
        <span className="truncate font-mono text-[0.75rem]">{RECORD.fileName}</span>
        <span aria-hidden="true" className="text-[0.7rem]" style={{ color: CHROME_DIM }}>
          ×
        </span>
      </span>
    </div>
    <div className="flex shrink-0 items-center gap-1 px-2">
      <ChromeItem>+</ChromeItem>
      <ChromeItem>◫</ChromeItem>
    </div>
  </div>
);

const StatusBar = ({ chrome, status }: { chrome: StageChrome; status: string }) => (
  <div
    className="flex shrink-0 items-center gap-3 px-3"
    style={{
      height: APP_METRICS.statusBarHeight,
      backgroundColor: UI,
      borderTop: `1px solid ${BORDER}`,
      color: CHROME_DIM,
    }}
  >
    <span className="truncate font-mono text-[0.72rem]" style={{ color: CHROME_TEXT }}>
      {RECORD.fileName}
    </span>
    <span
      className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-[2px] text-[0.66rem]"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
      {chrome.saved}
    </span>
    <span className="ml-auto flex shrink-0 items-center gap-3 font-mono text-[0.66rem]">
      <span aria-hidden="true">◐</span>
      <span>1 tabs</span>
      <span>editor</span>
      <span>{status}</span>
    </span>
  </div>
);

interface CodePaneProps {
  segments: Segment[][];
  labelledBy?: string;
  editable?: boolean;
  activeLine?: boolean;
  className?: string;
}

const CodePane = ({ segments, labelledBy, editable = false, activeLine = false, className = "" }: CodePaneProps) => (
  <div
    className={`relative min-h-0 ${className}`}
    style={{ "--fade-to": EDITOR_BG, "--stage-gutter": GUTTER } as CSSProperties}
  >
    <div
      className="no-scrollbar fade-bottom h-full overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: EDITOR_BG }}
      {...(editable
        ? {
            contentEditable: true,
            suppressContentEditableWarning: true,
            spellCheck: false,
            role: "textbox",
            "aria-multiline": true,
            "aria-labelledby": labelledBy,
          }
        : {})}
    >
      <div
        className="stage-code py-1.5 pr-3 font-mono"
        style={{ fontSize: APP_METRICS.codeFontSize, lineHeight: `${APP_METRICS.codeLineHeight}px` }}
      >
        {segments.map((segmentsOfLine, index) => (
          <div
            key={index}
            className="stage-line"
            style={activeLine && index === 0 ? { backgroundColor: ACTIVE_LINE } : undefined}
          >
            {segmentsOfLine.map((segment, segmentIndex) => (
              <span key={segmentIndex} style={TONE_STYLE[segment.tone]}>
                {segment.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const WorkspaceSidebar = ({ chrome }: { chrome: StageChrome }) => (
  <aside
    aria-label={chrome.workspace}
    className="hidden min-h-0 flex-col md:flex"
    style={{
      width: APP_METRICS.editorSidebarWidth,
      borderRight: `1px solid ${BORDER}`,
      backgroundColor: UI,
    }}
  >
    <div
      className="mx-2 mt-2 flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-[0.72rem]"
      style={{ border: `1px solid ${BORDER}`, color: CHROME_DIM }}
    >
      <span aria-hidden="true">⌕</span>
      <span className="truncate">{chrome.search}</span>
    </div>
    <p className="label-mono px-3 pb-1.5 pt-3" style={{ color: CHROME_DIM }}>
      {chrome.workspace}
    </p>
    <ul className="min-h-0 flex-1 overflow-hidden">
      {RECORD_TREE.map((node, index) => {
        const isFolderOpen = node.kind === "dir" && (RECORD_TREE[index + 1]?.depth ?? 0) > node.depth;
        return (
          <li
            key={`${node.depth}-${node.name}`}
            className="flex items-center gap-0 pr-2 text-[0.74rem]"
            style={{
              height: APP_METRICS.treeRowHeight,
              paddingLeft: 8 + node.depth * APP_METRICS.treeIndent,
              backgroundColor: node.active ? fadeToken(FG, UI, 10) : undefined,
              color: node.active ? ACCENT : node.kind === "dir" ? CHROME_DIM : CHROME_TEXT,
            }}
          >
            <span aria-hidden="true" className="grid w-4 shrink-0 place-items-center text-[0.6rem]">
              {node.kind === "dir" ? (isFolderOpen ? "▾" : "▸") : ""}
            </span>
            <span className="truncate">{node.name}</span>
          </li>
        );
      })}
    </ul>
  </aside>
);

/* ---------------------------------------------------------------------------
 * Vista 1: Editor
 * ------------------------------------------------------------------------ */

const EditorView = ({ chrome, modeNames }: { chrome: StageChrome; modeNames: [string, string] }) => (
  <div className="flex h-full flex-col">
    <AppBar mode="editor" chrome={chrome} modeNames={modeNames} />
    <TabStrip />
    <div className="flex min-h-0 flex-1">
      <WorkspaceSidebar chrome={chrome} />
      <CodePane className="flex-1" segments={SOURCE_SEGMENTS} labelledBy="aba-editor" editable activeLine />
    </div>
    <StatusBar chrome={chrome} status="edit" />
  </div>
);

/* ---------------------------------------------------------------------------
 * Vista 2: Memorias
 * ------------------------------------------------------------------------ */

const groupRecordsByMonth = (locale: Locale) => {
  const groups: Array<{ key: string; label: string; entries: typeof RECENT_RECORDS }> = [];
  for (const entry of RECENT_RECORDS) {
    const key = entry.date.slice(0, 7);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = { key, label: formatRecordMonth(locale, entry.date), entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
};

const MemoriesNav = ({ chrome }: { chrome: StageChrome }) => (
  <nav
    aria-label={chrome.nav.registry}
    className="hidden min-h-0 flex-col gap-3 overflow-hidden py-3 pl-3 pr-2 lg:flex"
    style={{ width: APP_METRICS.memoriesNavWidth, borderRight: `1px solid ${BORDER}`, backgroundColor: UI }}
  >
    <span
      className="flex items-center justify-center gap-2 rounded-[4px] py-1.5 text-[0.76rem] font-semibold"
      style={{ border: `1px solid ${BORDER}`, color: FG }}
    >
      <span aria-hidden="true">✎</span>
      {chrome.nav.newEntry}
    </span>

    <div aria-hidden="true" className="flex gap-1">
      {["▤", "⊞", "▣", "↻"].map((glyph) => (
        <span
          key={glyph}
          className="grid h-6 flex-1 place-items-center rounded-[3px] text-[0.72rem]"
          style={{ border: `1px solid ${BORDER}`, color: CHROME_DIM }}
        >
          {glyph}
        </span>
      ))}
    </div>

    <div>
      <p className="label-mono mb-1" style={{ color: CHROME_DIM }}>
        {chrome.nav.registry}
      </p>
      <ul>
        {[chrome.nav.registry, chrome.nav.byDay, chrome.nav.favorites].map((row, index) => (
          <li
            key={row}
            className="flex items-center gap-2 rounded-[3px] px-1.5 py-1 text-[0.74rem]"
            style={{
              backgroundColor: index === 0 ? fadeToken(FG, UI, 9) : undefined,
              color: index === 0 ? FG : CHROME_TEXT,
            }}
          >
            <span aria-hidden="true" className="text-[0.66rem]">
              ▤
            </span>
            <span className="truncate">{row}</span>
          </li>
        ))}
      </ul>
    </div>

    <div>
      <p className="label-mono mb-1" style={{ color: CHROME_DIM }}>
        {chrome.nav.tags}
      </p>
      <div className="flex flex-wrap gap-1">
        {RECORD.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-[3px] px-1.5 py-0.5 text-[0.66rem]"
            style={{ border: `1px solid ${BORDER}`, color: CHROME_TEXT }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>

    <div className="mt-auto flex rounded-[4px]" style={{ border: `1px solid ${BORDER}` }}>
      {chrome.nav.ranges.map((range, index) => (
        <span
          key={range}
          className="flex-1 py-1 text-center text-[0.64rem]"
          style={{
            backgroundColor: index === chrome.nav.ranges.length - 1 ? fadeToken(FG, UI, 12) : undefined,
            color: index === chrome.nav.ranges.length - 1 ? FG : CHROME_DIM,
          }}
        >
          {range}
        </span>
      ))}
    </div>
  </nav>
);

const MemoriesList = ({ chrome, locale }: { chrome: StageChrome; locale: Locale }) => (
  <div
    className="hidden min-h-0 flex-col lg:flex"
    style={{ width: APP_METRICS.memoriesListWidth, borderRight: `1px solid ${BORDER}`, backgroundColor: BG }}
  >
    <div className="flex items-start gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[3px] text-[0.75rem]"
        style={{ backgroundColor: fadeToken(FG, BG, 10), color: FG }}
      >
        ▤
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8rem] font-semibold" style={{ color: FG }}>
          {chrome.entries}
        </span>
        <span className="block truncate font-mono text-[0.66rem]" style={{ color: BODY_DIM }}>
          {RECORD.fileName}
        </span>
      </span>
    </div>

    <div className="flex items-center gap-1 px-2 py-1" style={{ borderBottom: `1px solid ${BORDER}` }}>
      {chrome.listViews.map((view, index) => (
        <span
          key={view}
          className="rounded-[3px] px-1.5 py-0.5 text-[0.64rem]"
          style={{
            backgroundColor: index === 0 ? fadeToken(FG, BG, 12) : undefined,
            color: index === 0 ? FG : BODY_DIM,
          }}
        >
          {view}
        </span>
      ))}
    </div>

    <div
      className="mx-2 my-1.5 flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[0.68rem]"
      style={{ border: `1px solid ${BORDER}`, color: BODY_DIM }}
    >
      <span aria-hidden="true">⌕</span>
      <span className="truncate">{chrome.search}</span>
    </div>

    <div className="min-h-0 flex-1 overflow-hidden">
      {groupRecordsByMonth(locale).map((group) => (
        <div key={group.key}>
          <p
            className="label-mono flex items-center justify-between px-3 py-1"
            style={{ backgroundColor: fadeToken(FG, BG, 7), color: BODY_DIM }}
          >
            <span className="truncate">{group.label}</span>
            <span>{group.entries.length}</span>
          </p>
          {group.entries.map((entry) => (
            <div
              key={entry.date}
              className="flex items-start gap-2 px-3 py-1.5"
              style={{
                backgroundColor: entry.active ? fadeToken(FG, BG, 9) : undefined,
                borderBottom: `1px solid ${fadeToken(FG, BG, 14)}`,
              }}
            >
              <span className="w-6 shrink-0 text-center font-mono text-[0.78rem]" style={{ color: FG }}>
                {formatRecordDay(locale, entry.date)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.74rem] font-semibold" style={{ color: FG }}>
                  {entry.title}
                </span>
                <span className="block truncate text-[0.66rem]" style={{ color: BODY_DIM }}>
                  {entry.summary}
                </span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const MemoriesReading = ({ chrome, locale }: { chrome: StageChrome; locale: Locale }) => (
  <article className="relative min-h-0 flex-1" style={{ backgroundColor: BG, color: FG }}>
    <div
      className="no-scrollbar fade-bottom h-full overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4"
      style={{ "--fade-to": BG } as CSSProperties}
    >
      <p className="label-mono truncate" style={{ color: BODY_DIM }}>
        {chrome.entries} · {formatRecordDate(locale, RECORD.date, "short")}
      </p>
      <h3 className="mt-1 text-[1.25rem] font-semibold leading-tight">{RECORD.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {RECORD.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2 py-0.5 text-[0.64rem]"
            style={{ border: `1px solid ${BORDER}`, color: BODY_TEXT }}
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto shrink-0 font-mono text-[0.6rem]" style={{ color: BODY_DIM }}>
          {WORD_COUNT} {chrome.words}
        </span>
      </div>

      <div
        className="mt-3 rounded-[4px] px-2.5 py-1.5"
        style={{ border: `1px solid ${BORDER}`, backgroundColor: fadeToken(FG, BG, 5) }}
      >
        <p className="label-mono" style={{ color: BODY_DIM }}>
          {chrome.metadata}
        </p>
        <p className="mt-0.5 truncate font-mono text-[0.68rem]">
          {chrome.properties.record}: {RECORD.title}
        </p>
      </div>

      {RECORD.sections.map((section) => (
        <section key={section.heading} className="mt-4">
          <h4
            className="border-b pb-1 text-[1.05rem] font-semibold leading-tight"
            style={{ borderColor: fadeToken(FG, BG, 26), fontFamily: "var(--font-serif)" }}
          >
            {section.heading}
          </h4>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-1.5 text-[0.74rem] leading-relaxed" style={{ color: BODY_TEXT }}>
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-1.5 grid gap-1">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-[0.74rem] leading-relaxed" style={{ color: BODY_TEXT }}>
                  <span aria-hidden="true" style={{ color: ACCENT }}>
                    –
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  </article>
);

const MemoriesView = ({
  chrome,
  locale,
  modeNames,
}: {
  chrome: StageChrome;
  locale: Locale;
  modeNames: [string, string];
}) => (
  <div className="flex h-full flex-col">
    <AppBar mode="memories" chrome={chrome} modeNames={modeNames} />
    <div className="flex min-h-0 flex-1">
      <MemoriesNav chrome={chrome} />
      <MemoriesList chrome={chrome} locale={locale} />
      <MemoriesReading chrome={chrome} locale={locale} />
    </div>
    <StatusBar chrome={chrome} status="split" />
  </div>
);

/* ---------------------------------------------------------------------------
 * Vista 3: o arquivo cru
 * ------------------------------------------------------------------------ */

const SourceView = ({ chrome }: { chrome: StageChrome }) => (
  <div className="flex h-full flex-col">
    <div
      className="flex shrink-0 items-center gap-2 px-3"
      style={{ height: APP_METRICS.barHeight, backgroundColor: UI, borderBottom: `1px solid ${BORDER}` }}
    >
      <span className="label-mono" style={{ color: CHROME_DIM }}>
        {chrome.properties.file}
      </span>
      <span className="truncate font-mono text-[0.75rem]" style={{ color: FG }}>
        {RECORD.fileName}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[0.66rem]" style={{ color: CHROME_DIM }}>
        MD · UTF-8
      </span>
    </div>
    <CodePane className="flex-1" segments={SOURCE_SEGMENTS} labelledBy="aba-source" editable />
  </div>
);

/* ---------------------------------------------------------------------------
 * O palco
 * ------------------------------------------------------------------------ */

interface StageProps {
  locale: Locale;
}

/**
 * Palco: o mesmo registro em tres leituras, todas recriadas em codigo sobre a
 * janela real do aplicativo (medidas em `app-metrics.ts`).
 *
 * A caixa tem altura fixa de proposito. O painel rola por dentro (sem barra,
 * com degradê na base), mas a caixa nao muda de tamanho — trocar de aba nao
 * desloca nada abaixo. As legendas ficam empilhadas na mesma celula de grade,
 * entao a altura reservada e a da mais longa, em qualquer idioma.
 */
const Stage = ({ locale }: StageProps) => {
  const stage = getCopy(locale).pages.home.stage;
  const chrome = stage.chrome;
  const modeNames: [string, string] = [stage.views[0].name, stage.views[1].name];
  const [view, setView] = useState<StageView>("editor");
  const activeIndex = stage.views.findIndex((item) => item.id === view);

  return (
    <section
      id="leituras"
      aria-labelledby="leituras-titulo"
      className="margins-stage relative scroll-mt-14 overflow-hidden border-b border-stage-rule bg-stage text-stage-foreground"
    >
      <div className="measure border-l border-stage-accent/30 px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionHead id="leituras" index={stage.index} label={stage.label} title={stage.title} tone="stage" />
          </div>
          <p className="max-w-md text-base text-stage-foreground/80 lg:col-span-4 lg:col-start-9 lg:pb-2">
            {stage.intro}
          </p>
        </div>

        <div role="tablist" aria-label={stage.label} className="mt-12 inline-flex flex-wrap border border-stage-rule">
          {stage.views.map((item) => {
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`aba-${item.id}`}
                aria-selected={active}
                aria-controls={`painel-${item.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setView(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  const step = event.key === "ArrowRight" ? 1 : -1;
                  const next = stage.views[(activeIndex + step + stage.views.length) % stage.views.length];
                  setView(next.id);
                  document.getElementById(`aba-${next.id}`)?.focus();
                }}
                className={`min-h-[44px] border-r border-stage-rule px-5 text-sm font-semibold transition-colors last:border-r-0 ${
                  active ? "bg-stage-foreground text-stage" : "text-stage-foreground hover:bg-stage-2"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        <div
          id={`painel-${view}`}
          role="tabpanel"
          aria-labelledby={`aba-${view}`}
          className="mt-6 h-[30rem] overflow-hidden border border-stage-rule shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] md:h-[37rem]"
        >
          {view === "editor" ? <EditorView chrome={chrome} modeNames={modeNames} /> : null}
          {view === "memories" ? <MemoriesView chrome={chrome} locale={locale} modeNames={modeNames} /> : null}
          {view === "source" ? <SourceView chrome={chrome} /> : null}
        </div>

        <div className="mt-4 grid">
          {stage.views.map((item) => (
            <p
              key={item.id}
              aria-hidden={item.id !== view}
              className={`[grid-area:1/1] text-sm leading-relaxed text-stage-foreground/75 ${
                item.id === view ? "" : "invisible"
              }`}
            >
              {item.caption}
            </p>
          ))}
        </div>

        <p className="mt-8 border-t border-stage-rule pt-4 font-mono text-[0.6875rem] text-stage-muted">
          {stage.note}
        </p>
      </div>
    </section>
  );
};

export default Stage;
