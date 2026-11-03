import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import SectionHead from "@/aurora/SectionHead";
import { APP_METRICS, STAGE_APP_THEME } from "@/aurora/app-metrics";
import { AppWindow, CodePane } from "@/aurora/app-window";
import { Palette, Segment, paletteOf } from "@/aurora/app-window-tokens";
import { RECENT_RECORDS, RECORD, RECORD_SOURCE_LINES, RECORD_TREE, recordWordCount } from "@/aurora/demo";
import { formatRecordDate, formatRecordDay, formatRecordMonth } from "@/aurora/record-format";
import { alphaToken, fadeToken } from "@/aurora/theme-tokens";
import logo from "@/assets/logo-tile.png";
import { Locale, SiteCopy, StageView, getCopy } from "@/i18n";

type StageChrome = SiteCopy["pages"]["home"]["stage"]["chrome"];

const M = APP_METRICS;
const APP = STAGE_APP_THEME;
const PALETTE = paletteOf(APP);

/* ---------------------------------------------------------------------------
 * O documento que as tres leituras mostram
 * ------------------------------------------------------------------------ */

const DOC = {
  fileName: RECORD.fileName,
  lines: RECORD_SOURCE_LINES,
  tree: RECORD_TREE.map((node) => ({
    depth: node.depth,
    name: node.name,
    kind: node.kind,
    // A pasta aberta e a que tem filho visivel logo abaixo dela.
    open: node.kind === "dir" && (RECORD_TREE[RECORD_TREE.indexOf(node) + 1]?.depth ?? 0) > node.depth,
    active: Boolean(node.active),
  })),
};

const WORD_COUNT = recordWordCount(RECORD);

/** A leitura "Arquivo.md" mostra o texto como esta no disco: sem token, sem
 *  linha ativa. O que muda entre as leituras e o significado, nao a métrica. */
const SOURCE_PLAIN: Segment[][] = RECORD_SOURCE_LINES.map((line) => [{ text: line, tone: "plain" as const }]);

/* ---------------------------------------------------------------------------
 * Vista 2: Memorias
 *
 * O cromo em volta (barra de titulo, barra de status) e o mesmo componente das
 * outras leituras. As tres colunas entram como corpo da janela, nas larguras
 * medidas no aplicativo: 240 da navegacao e 380 da lista.
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

const MemoriesNav = ({ palette, chrome }: { palette: Palette; chrome: StageChrome }) => (
  <nav
    aria-label={chrome.nav.registry}
    style={{
      boxSizing: "border-box",
      width: M.memories.navWidth,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      background: alphaToken(palette.ui, 0.25),
      color: palette.fg,
      borderRight: `1px solid ${palette.border}`,
      fontFamily: "inherit",
    }}
  >
    <div
      style={{
        height: M.memories.navHeaderHeight,
        boxSizing: "border-box",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        padding: `${M.memories.navHeaderPaddingY}px ${M.memories.navHeaderPaddingX}px`,
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", opacity: 0.38 }}
      >
        <Menu size={16} strokeWidth={1.9} />
      </span>
    </div>

    <div style={{ padding: `0 ${M.memories.navHeaderPaddingX}px 12px`, display: "grid", gap: 8 }}>
      <span
        style={{
          height: 36,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 6,
          background: palette.accent,
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: "19.5px",
        }}
      >
        <span aria-hidden="true">✎</span>
        {chrome.nav.newEntry}
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {["▤", "＋", "▣", "↻"].map((glyph) => (
          <span
            key={glyph}
            aria-hidden="true"
            style={{
              height: 32,
              display: "grid",
              placeItems: "center",
              borderRadius: 6,
              border: `1px solid ${palette.border}`,
              background: alphaToken(palette.bg, 0.5),
              color: alphaToken(palette.fg, 0.525),
            }}
          >
            {glyph}
          </span>
        ))}
      </div>
    </div>

    <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
      <p
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          margin: 0,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 600,
          lineHeight: "16.5px",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: alphaToken(palette.fg, 0.44),
        }}
      >
        <span aria-hidden="true">▾</span>
        {chrome.entries}
      </p>

      {groupRecordsByMonth("pt-BR")
        .slice(0, 2)
        .map((group) => (
          <div key={group.key} style={{ padding: "0 8px 4px" }}>
            {group.entries.slice(0, 2).map((entry) => (
              <div
                key={entry.date}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: entry.active ? alphaToken(palette.fg, 0.1) : "transparent",
                }}
              >
                <span
                  style={{
                    width: 24,
                    flex: "0 0 auto",
                    textAlign: "center",
                    fontSize: 12,
                    lineHeight: "16px",
                    color: alphaToken(palette.fg, 0.7),
                  }}
                >
                  {formatRecordDay("pt-BR", entry.date)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, lineHeight: "16px" }}>
                    {entry.title}
                  </span>
                  <span style={{ display: "block", fontSize: 11, lineHeight: "15px", color: alphaToken(palette.fg, 0.6) }}>
                    {entry.summary}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ))}

      <div style={{ padding: "8px 12px 0" }}>
        <p
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: alphaToken(palette.fg, 0.44),
          }}
        >
          {chrome.nav.tags}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {RECORD.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 6px",
                borderRadius: 4,
                border: `1px solid ${palette.border}`,
                fontSize: 11,
                lineHeight: "15px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div
      style={{
        display: "flex",
        margin: `0 ${M.memories.navHeaderPaddingX}px 12px`,
        borderRadius: 4,
        border: `1px solid ${palette.border}`,
      }}
    >
      {chrome.nav.ranges.map((range, index) => (
        <span
          key={range}
          style={{
            flex: "1 1 0",
            padding: "4px 0",
            textAlign: "center",
            fontSize: 10,
            background: index === chrome.nav.ranges.length - 1 ? alphaToken(palette.fg, 0.12) : "transparent",
            color: index === chrome.nav.ranges.length - 1 ? palette.fg : alphaToken(palette.fg, 0.55),
          }}
        >
          {range}
        </span>
      ))}
    </div>
  </nav>
);

const MemoriesList = ({ palette, chrome, locale }: { palette: Palette; chrome: StageChrome; locale: Locale }) => (
  <div
    style={{
      boxSizing: "border-box",
      width: M.memories.listWidth,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      background: palette.bg,
      color: palette.fg,
      borderRight: `1px solid ${palette.border}`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 12px",
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: 4,
          background: alphaToken(palette.fg, 0.1),
          fontSize: 12,
        }}
      >
        ▤
      </span>
      <span style={{ minWidth: 0, flex: "1 1 0" }}>
        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>
          {chrome.entries}
        </span>
        <span
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11,
            color: fadeToken(palette.fg, palette.bg, 58),
          }}
        >
          {RECORD.fileName}
        </span>
      </span>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderBottom: `1px solid ${palette.border}` }}>
      {chrome.listViews.map((view, index) => (
        <span
          key={view}
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 11,
            background: index === 0 ? alphaToken(palette.fg, 0.12) : "transparent",
            color: index === 0 ? palette.fg : fadeToken(palette.fg, palette.bg, 58),
          }}
        >
          {view}
        </span>
      ))}
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        margin: "6px 8px",
        padding: "4px 8px",
        borderRadius: 4,
        border: `1px solid ${palette.border}`,
        fontSize: 11,
        color: fadeToken(palette.fg, palette.bg, 58),
      }}
    >
      <span aria-hidden="true">⌕</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chrome.search}</span>
    </div>

    <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
      {groupRecordsByMonth(locale).map((group) => (
        <div key={group.key}>
          <p
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: 0,
              padding: "4px 12px",
              background: alphaToken(palette.fg, 0.07),
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: fadeToken(palette.fg, palette.bg, 58),
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.label}</span>
            <span>{group.entries.length}</span>
          </p>
          {group.entries.map((entry) => (
            <div
              key={entry.date}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 12px",
                background: entry.active ? alphaToken(palette.fg, 0.09) : "transparent",
                borderBottom: `1px solid ${alphaToken(palette.fg, 0.14)}`,
              }}
            >
              <span
                style={{
                  width: 24,
                  flex: "0 0 auto",
                  textAlign: "center",
                  fontSize: 13,
                  lineHeight: "18px",
                }}
              >
                {formatRecordDay(locale, entry.date)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {entry.title}
                </span>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    color: fadeToken(palette.fg, palette.bg, 58),
                  }}
                >
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

const MemoriesReading = ({ palette, chrome, locale }: { palette: Palette; chrome: StageChrome; locale: Locale }) => (
  <article style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, overflow: "hidden", background: palette.bg, color: palette.fg }}>
    <div style={{ height: "100%", overflow: "hidden", padding: "12px 16px" }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: fadeToken(palette.fg, palette.bg, 58),
        }}
      >
        {chrome.entries} · {formatRecordDate(locale, RECORD.date, "short")}
      </p>
      <h3 style={{ margin: "4px 0 0", fontSize: 20, lineHeight: 1.25, fontWeight: 600 }}>{RECORD.title}</h3>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 8 }}>
        {RECORD.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: "2px 8px",
              borderRadius: 9999,
              border: `1px solid ${palette.border}`,
              fontSize: 11,
            }}
          >
            {tag}
          </span>
        ))}
        <span style={{ marginLeft: "auto", flex: "0 0 auto", fontSize: 10, color: fadeToken(palette.fg, palette.bg, 58) }}>
          {WORD_COUNT} {chrome.words}
        </span>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "6px 10px",
          borderRadius: 4,
          border: `1px solid ${palette.border}`,
          background: alphaToken(palette.fg, 0.05),
        }}
      >
        <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: fadeToken(palette.fg, palette.bg, 58) }}>
          {chrome.metadata}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11 }}>
          {chrome.properties.record}: {RECORD.title}
        </p>
      </div>

      {RECORD.sections.map((section) => (
        <section key={section.heading} style={{ marginTop: 16 }}>
          <h4
            style={{
              margin: 0,
              paddingBottom: 4,
              borderBottom: `1px solid ${alphaToken(palette.fg, 0.26)}`,
              fontSize: 17,
              lineHeight: 1.2,
              fontWeight: 600,
              fontFamily: "var(--font-serif)",
            }}
          >
            {section.heading}
          </h4>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: fadeToken(palette.fg, palette.bg, 84) }}>
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {section.bullets.map((bullet) => (
                <li key={bullet} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.6, color: fadeToken(palette.fg, palette.bg, 84) }}>
                  <span aria-hidden="true" style={{ color: palette.accent }}>
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

/* ---------------------------------------------------------------------------
 * O palco
 * ------------------------------------------------------------------------ */

interface StageProps {
  locale: Locale;
}

/**
 * Palco: o mesmo registro em tres leituras sobre a janela real do aplicativo.
 *
 * A janela e a mesma nas tres abas — barra de titulo, faixa de abas e barra de
 * status saem de um componente so, com as medidas do DOM do aplicativo
 * (`app-metrics.ts`, medido em `.dev/tmp/stage-medidas/`). Trocar de leitura
 * troca o corpo, nao o cromo.
 *
 * A caixa tem altura fixa de proposito: trocar de aba nao desloca nada abaixo.
 * O corpo rola por dentro (sem barra visivel, com degrade na base), como o
 * aplicativo faz na janela estreita.
 */
const Stage = ({ locale }: StageProps) => {
  const stage = getCopy(locale).pages.home.stage;
  const chrome = stage.chrome;
  const [view, setView] = useState<StageView>("editor");
  const activeIndex = stage.views.findIndex((item) => item.id === view);
  const modeNames: [string, string] = [stage.views[0].name, stage.views[1].name];

  const windowProps = {
    theme: APP,
    doc: DOC,
    menus: chrome.menus,
    modeNames,
    workspace: chrome.workspace,
    search: chrome.search,
    saved: chrome.saved,
    brand: logo,
    closeLabel: chrome.properties.file,
  };

  /**
   * O que muda entre as tres leituras e o **corpo**, nao a janela: barra de
   * titulo, faixa de abas e barra de status sao as mesmas nas tres. Em
   * "Arquivo.md" troca-se so o painel (texto cru, sem realce e sem linha ativa);
   * em Memorias troca-se o corpo inteiro, porque o aplicativo tambem nao mostra
   * faixa de abas no modo Memorias.
   */
  const sourcePane = <CodePane palette={PALETTE} segments={SOURCE_PLAIN} activeLine={false} gutter />;
  const memoriesBody = (
    <>
      <MemoriesNav palette={PALETTE} chrome={chrome} />
      <MemoriesList palette={PALETTE} chrome={chrome} locale={locale} />
      <MemoriesReading palette={PALETTE} chrome={chrome} locale={locale} />
    </>
  );

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
          <AppWindow
            {...windowProps}
            mode={view === "memories" ? "memories" : "editor"}
            draft={view === "memories" ? chrome.draft : undefined}
            pane={view === "source" ? sourcePane : undefined}
          >
            {view === "memories" ? memoriesBody : undefined}
          </AppWindow>
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
