import { ReactNode, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  FolderPlus,
  Heart,
  Image as ImageIcon,
  LucideIcon,
  MapPin,
  Menu,
  PenLine,
  Pin,
  Plus,
  RefreshCw,
  Save,
  Tag,
} from "lucide-react";
import SectionHead from "@/aurora/SectionHead";
import { APP_METRICS, STAGE_APP_THEME } from "@/aurora/app-metrics";
import { AppWindow, CodePane, WindowContext } from "@/aurora/app-window";
import { Palette, Segment, paletteOf } from "@/aurora/app-window-tokens";
import { DEMO_JOURNAL, RECENT_RECORDS, RECORD, RECORD_SOURCE_LINES, RECORD_TREE, recordWordCount } from "@/aurora/demo";
import { formatRecordDate, formatRecordDay } from "@/aurora/record-format";
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
 * Memorias nao tem a arvore de pastas do editor. O conceito e outro: ela lista
 * **cadernos** e, dentro do caderno aberto, as secoes do diario — Registros,
 * Favoritos, Calendario, Lugares, Galeria, Tags e Pins. Sob Registros vem a
 * lista de registros por data. O cromo em volta (barra de titulo e barra de
 * status) e o mesmo componente das outras leituras; o que muda e o corpo, e a
 * faixa de acoes do topo, que vira a do diario.
 *
 * As medidas saem da medicao do app na vista Memorias: cabecalho de 44, botao
 * principal de 36, botoes quadrados de 32, acordeao de 29 e item de 32.
 * ------------------------------------------------------------------------ */

type MemorySection = keyof StageChrome["nav"]["sections"];

const MEMORY_SECTIONS: Array<{ id: MemorySection; icon: LucideIcon }> = [
  { id: "entries", icon: BookOpen },
  { id: "favorites", icon: Heart },
  { id: "calendar", icon: CalendarDays },
  { id: "places", icon: MapPin },
  { id: "gallery", icon: ImageIcon },
  { id: "tags", icon: Tag },
  { id: "pins", icon: Pin },
];

const JOURNAL_ACTIONS: Array<{ id: string; icon: LucideIcon }> = [
  { id: "save", icon: Save },
  { id: "newJournal", icon: Plus },
  { id: "addJournal", icon: FolderPlus },
  { id: "refresh", icon: RefreshCw },
];

/** Titulo de acordeao da lateral: 11px em caixa alta, com o chevron do app. */
const NavHeading = ({ palette, children }: { palette: Palette; children: ReactNode }) => (
  <p
    style={{
      display: "flex",
      alignItems: "center",
      gap: M.memories.accordion.gap,
      margin: 0,
      height: M.memories.accordion.height,
      boxSizing: "border-box",
      padding: `${M.memories.accordion.paddingY}px ${M.memories.accordion.paddingX}px`,
      fontSize: M.memories.accordion.fontSize,
      fontWeight: 600,
      lineHeight: `${M.memories.accordion.lineHeight}px`,
      letterSpacing: M.memories.accordion.letterSpacing,
      textTransform: "uppercase",
      color: alphaToken(palette.fg, M.memories.accordion.opacity),
    }}
  >
    <ChevronDown size={M.memories.accordion.chevron} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden="true" />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
  </p>
);

const NavDivider = ({ palette }: { palette: Palette }) => (
  <div
    aria-hidden="true"
    style={{
      height: 1,
      margin: `${M.memories.divider.marginY}px ${M.memories.divider.marginX}px`,
      background: palette.border,
    }}
  />
);

/** O cartao do caderno aberto: capa, nome e descricao — como o app o desenha. */
const JournalCard = ({ palette, chrome }: { palette: Palette; chrome: StageChrome }) => (
  <div style={{ padding: `4px ${M.memories.card.marginX}px`, paddingBottom: M.memories.card.marginY }}>
    <div
      style={{
        position: "relative",
        height: M.memories.card.height,
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: M.memories.card.radius,
        /* A capa no app e uma foto do caderno. Aqui ela e o acento do tema em
         * gradiente: melhor uma capa assumidamente grafica do que a foto de
         * outra pessoa fazendo papel de capa de um caderno que nao existe. */
        backgroundImage: `linear-gradient(150deg, ${alphaToken(palette.accent, 0.92)}, ${palette.bg})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0) 60%)",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `0 ${M.memories.card.paddingX}px ${M.memories.card.paddingY}px` }}>
        <p
          style={{
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: M.memories.card.nameSize,
            fontWeight: 600,
            lineHeight: `${M.memories.card.nameLineHeight}px`,
            color: "#ffffff",
          }}
        >
          {DEMO_JOURNAL.name}
        </p>
        <p
          style={{
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: M.memories.card.descriptionSize,
            lineHeight: `${M.memories.card.descriptionLineHeight}px`,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {DEMO_JOURNAL.description}
        </p>
        <p
          style={{
            margin: 0,
            marginTop: 2,
            fontSize: M.memories.card.descriptionSize,
            lineHeight: `${M.memories.card.descriptionLineHeight}px`,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {DEMO_JOURNAL.entries} {chrome.nav.journalEntries}
        </p>
      </div>
    </div>
  </div>
);

/**
 * A lateral de Memorias.
 *
 * Empilhada (janela estreita) ela ocupa a largura toda e a leitura sai: o que
 * interessa num telefone e navegar. No tamanho real do app ela tem os 240px
 * medidos e a leitura fica ao lado.
 */
const MemoriesSidebar = ({ palette, chrome, locale, stacked }: { palette: Palette; chrome: StageChrome; locale: Locale; stacked: boolean }) => (
  <nav
    aria-label={chrome.nav.journal}
    style={{
      boxSizing: "border-box",
      width: stacked ? "100%" : M.memories.navWidth,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      background: alphaToken(palette.ui, 0.25),
      color: palette.fg,
      borderRight: stacked ? "none" : `1px solid ${palette.border}`,
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
        style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 4, color: alphaToken(palette.fg, 0.38) }}
      >
        <Menu size={16} strokeWidth={1.9} />
      </span>
    </div>

    <div style={{ padding: `0 ${M.memories.navHeaderPaddingX}px 12px`, display: "grid", flex: "0 0 auto" }}>
      <span
        role="img"
        aria-label={chrome.nav.newEntry}
        style={{
          height: M.memories.primary.height,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: M.memories.primary.gap,
          marginBottom: M.memories.primary.marginBottom,
          padding: `${M.memories.primary.paddingY}px ${M.memories.primary.paddingX}px`,
          borderRadius: M.memories.primary.radius,
          background: palette.accent,
          color: palette.bg,
          fontSize: M.memories.primary.fontSize,
          fontWeight: 600,
          lineHeight: `${M.memories.primary.lineHeight}px`,
          whiteSpace: "nowrap",
        }}
      >
        <PenLine size={M.memories.primary.iconSize} strokeWidth={1.9} aria-hidden="true" />
        {chrome.nav.newEntry}
      </span>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${M.memories.ghost.columns}, 1fr)`, gap: M.memories.ghost.gap }}>
        {JOURNAL_ACTIONS.map(({ id, icon: Icon }) => (
          <span
            key={id}
            aria-hidden="true"
            style={{
              height: M.memories.ghost.height,
              display: "grid",
              placeItems: "center",
              borderRadius: M.memories.ghost.radius,
              border: `1px solid ${palette.border}`,
              background: alphaToken(palette.bg, 0.5),
              color: alphaToken(palette.fg, 0.525),
            }}
          >
            <Icon size={M.memories.ghost.iconSize} strokeWidth={1.9} />
          </span>
        ))}
      </div>
    </div>

    <div className="no-scrollbar" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto" }}>
      <NavHeading palette={palette}>{chrome.nav.journal}</NavHeading>
      <JournalCard palette={palette} chrome={chrome} />

      <NavDivider palette={palette} />

      {MEMORY_SECTIONS.map(({ id, icon: Icon }) => {
        const active = id === "entries";
        return (
          <div key={id}>
            <div
              data-stage-part="memory-section"
              data-stage-active={active ? "true" : undefined}
              style={{
                height: M.memories.item.height,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: M.memories.item.gap,
                padding: `${M.memories.item.paddingY}px ${M.memories.item.paddingX}px`,
                background: active ? alphaToken(palette.fg, M.memories.item.activeAlpha) : "transparent",
                color: active ? palette.fg : alphaToken(palette.fg, M.memories.item.inactiveOpacity),
                fontSize: M.memories.item.fontSize,
                lineHeight: `${M.memories.item.lineHeight}px`,
                fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <Icon size={M.memories.item.iconSize} strokeWidth={1.9} style={{ flex: "0 0 auto" }} aria-hidden="true" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{chrome.nav.sections[id]}</span>
            </div>

            {id === "entries" ? (
              <div style={{ paddingBottom: 4 }}>
                {RECENT_RECORDS.map((entry) => (
                  <div
                    key={entry.date}
                    data-stage-part="memory-record"
                    data-stage-active={entry.active ? "true" : undefined}
                    style={{
                      height: M.memories.record.height,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      gap: M.memories.record.gap,
                      padding: `${M.memories.record.paddingY}px ${M.memories.record.paddingX}px`,
                      paddingLeft: M.memories.record.paddingX + M.memories.record.indent,
                      background: entry.active ? alphaToken(palette.fg, M.memories.record.activeAlpha) : "transparent",
                      color: entry.active ? palette.fg : alphaToken(palette.fg, 0.72),
                      fontSize: M.memories.record.fontSize,
                      lineHeight: `${M.memories.record.lineHeight}px`,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        width: M.memories.record.dayWidth,
                        flex: "0 0 auto",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: alphaToken(palette.fg, 0.55),
                      }}
                    >
                      {formatRecordDay(locale, entry.date)}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: entry.active ? 600 : 400 }}>
                      {entry.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  </nav>
);

/** A leitura do registro aberto: o que o caderno mostra a direita. */
const MemoriesReading = ({ palette, chrome, locale }: { palette: Palette; chrome: StageChrome; locale: Locale }) => (
  <article style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, overflow: "hidden", background: palette.bg, color: palette.fg }}>
    <div style={{ height: "100%", overflow: "hidden", padding: "16px 20px" }}>
      <div style={{ maxWidth: "42rem", margin: "0 auto" }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: fadeToken(palette.fg, palette.bg, 58),
          }}
        >
          {chrome.nav.sections.entries} · {formatRecordDate(locale, RECORD.date, "short")}
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
    labels: chrome.actions,
  };

  /**
   * O que muda entre as tres leituras e o **corpo** e a **faixa de acoes**, nao
   * a moldura: barra de titulo, faixa de abas e barra de status sao as mesmas
   * nas tres. Em "Arquivo.md" troca-se so o painel (texto cru, sem realce e sem
   * linha ativa); em Memorias troca-se o corpo inteiro, porque o aplicativo
   * tambem nao mostra faixa de abas no modo Memorias — e a faixa de cima vira a
   * do diario.
   */
  const sourcePane = <CodePane palette={PALETTE} segments={SOURCE_PLAIN} activeLine={false} gutter />;
  const memoriesBody = ({ narrow }: WindowContext) => (
    <>
      <MemoriesSidebar palette={PALETTE} chrome={chrome} locale={locale} stacked={narrow} />
      {narrow ? null : <MemoriesReading palette={PALETTE} chrome={chrome} locale={locale} />}
    </>
  );

  return (
    <section
      id="leituras"
      aria-labelledby="leituras-titulo"
      className="margins-stage relative scroll-mt-14 overflow-hidden border-b border-stage-rule bg-stage text-stage-foreground"
    >
      {/* A grade de tres colunas existe para a janela poder sair da coluna de
       *  leitura sem `100vw` — que traz a barra de rolagem junto e estoura a
       *  pagina. O texto fica na coluna do meio, de 68rem; a janela atravessa as
       *  tres e ganha a largura da tela. E o que devolve o tamanho real ao app:
       *  em 1440 ele aparece com 1377px, em px reais, em vez dos 1005px de antes
       *  — era essa diferenca que fazia o texto parecer maior que no aplicativo,
       *  com os mesmos 12px de cromo e 16px de editor. */}
      <div className="grid grid-cols-[minmax(0,1fr)_min(100%,68rem)_minmax(0,1fr)]">
        <div className="col-start-2 border-l border-stage-accent/30 px-6 pt-20 lg:px-10 lg:pt-28">
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
        </div>

        <div className="col-span-3 col-start-1 mt-6 px-4 md:px-6">
          <div className="mx-auto w-full max-w-[90rem]">
            <div
              id={`painel-${view}`}
              role="tabpanel"
              aria-labelledby={`aba-${view}`}
              className="h-[34rem] overflow-hidden border border-stage-rule shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)] md:h-[38rem] lg:h-[46rem]"
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
          </div>
        </div>

        <div className="col-start-2 border-l border-stage-accent/30 px-6 pb-20 lg:px-10 lg:pb-28">
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
      </div>
    </section>
  );
};

export default Stage;
