import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Copy,
  Download,
  FileText,
  FolderPlus,
  Heart,
  Inbox,
  Info,
  Image as ImageIcon,
  ListTodo,
  LucideIcon,
  MapPin,
  Menu,
  MoreHorizontal,
  PenLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Tag,
} from "lucide-react";
import SectionHead from "@/aurora/SectionHead";
import StageVeil from "@/aurora/StageVeil";
import { APP_METRICS, STAGE_APP_THEME } from "@/aurora/app-metrics";
import { AppWindow, CodePane, WindowContext } from "@/aurora/app-window";
import { Palette, alpha, paletteOf, tokenize } from "@/aurora/app-window-tokens";
import {
  DEMO_JOURNAL,
  MOOD_EMOJI,
  NOTEBOOK_PINS,
  NOTEBOOK_RECORDS,
  NOTEBOOK_TAGS,
  NOTEBOOK_TASKS,
  RECORD,
  RECORD_SOURCE_LINES,
  RECORD_TREE,
  recordToBodyLines,
  recordWordCount,
} from "@/aurora/demo";
import cover from "@/assets/nebulosa-orion.webp";
import logo from "@/assets/logo-tile.png";
import { Locale, SiteCopy, StageView, getCopy } from "@/i18n";

type StageChrome = SiteCopy["pages"]["home"]["stage"]["chrome"];

const M = APP_METRICS;
const APP = STAGE_APP_THEME;
const PALETTE = paletteOf(APP);
const MEM = M.memories;
const J = M.journal;

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
/** As linhas que o painel de codigo mostra: o corpo, nao o arquivo inteiro. */
const BODY_LINES = recordToBodyLines(RECORD);

/** O corpo do registro em `preview`, como o app o renderiza: sem o `# titulo`
 *  (o titulo vem do front-matter) e sem as marcas de Markdown. */
const PREVIEW = {
  lead: RECORD.lead,
  sections: RECORD.sections.map((section) => ({
    heading: section.heading,
    paragraphs: section.paragraphs,
    bullets: section.bullets ?? [],
  })),
};

/* ---------------------------------------------------------------------------
 * Vista 2: Memorias, refeita a partir da tela real
 *
 * A recriacao anterior tinha duas colunas: lateral com uma lista de secoes
 * soltas (Registros, Favoritos, Calendario, Lugares, Galeria, Tags, Pins) e a
 * leitura ao lado. O aplicativo tem tres colunas e uma hierarquia diferente:
 *
 *   lateral  240   quatro acordeoes (Cadernos, Registros, Tags, Tarefas) + Pins
 *                  preso no rodape; os registros NAO moram aqui
 *   lista    380   cabecalho do caderno, seletor de vistas, busca e os registros
 *                  agrupados por mes, com dia, mes abreviado e miniatura
 *   entrada  821   capa, cabecalho (sobrancelha, titulo, chips, contagem) e o
 *                  corpo dividido: codigo | visualizacao com o bloco METADADOS
 *
 * Cada numero abaixo foi medido no app rodando em 1440x900, tema Midnight, com
 * este mesmo registro aberto — nao vem de estimativa de olho.
 * ------------------------------------------------------------------------ */

const accordionStyle = (palette: Palette) => ({
  width: "100%",
  boxSizing: "border-box" as const,
  display: "flex",
  alignItems: "center",
  gap: MEM.accordion.gap,
  height: MEM.accordion.height,
  margin: 0,
  padding: `${MEM.accordion.paddingY}px ${MEM.accordion.paddingX}px`,
  background: "transparent",
  border: "none",
  fontSize: MEM.accordion.fontSize,
  fontWeight: 600,
  lineHeight: `${MEM.accordion.lineHeight}px`,
  letterSpacing: MEM.accordion.letterSpacing,
  textTransform: "uppercase" as const,
  color: alpha(palette.fg, MEM.accordion.colorAlpha),
  fontFamily: "inherit",
});

const Accordion = ({
  palette,
  title,
  children,
  bodyPadding = true,
}: {
  palette: Palette;
  title: string;
  children: ReactNode;
  bodyPadding?: boolean;
}) => (
  <div>
    <p data-stage-part="memory-accordion" style={accordionStyle(palette)}>
      <ChevronDown size={MEM.accordion.chevron} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden="true" />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
    </p>
    <div style={{ paddingBottom: bodyPadding ? 4 : 0 }}>{children}</div>
  </div>
);

const Divider = ({ palette }: { palette: Palette }) => (
  <div
    aria-hidden="true"
    style={{
      height: 1,
      margin: `${MEM.divider.marginY}px ${MEM.divider.marginX}px`,
      background: palette.border,
    }}
  />
);

/** O cartao do caderno aberto: capa, nome e descricao — e nada de contagem. */
const JournalCard = ({ palette, chrome }: { palette: Palette; chrome: StageChrome }) => (
  <div style={{ padding: `${MEM.card.marginY}px ${MEM.card.marginX}px` }}>
    {/* `inline-block`: no app o cartao e um `<button>` dentro de um bloco, e o
     *  alinhamento pela linha base deixa 7px de folga embaixo — e essa folga
     *  empurra todo o resto da lateral. Reproduzir o mecanismo vale mais do que
     *  escrever 7 em algum lugar. */}
    <div
      data-stage-part="memory-notebook-card"
      style={{
        display: "inline-block",
        width: "100%",
        position: "relative",
        height: MEM.card.height,
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: MEM.card.radius,
        background: alpha(palette.accent, 0.35),
      }}
    >
      <img
        src={cover}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, transparent ${MEM.card.overlayStart}%, rgba(0,0,0,${MEM.card.overlayAlpha}) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: MEM.card.radius,
          pointerEvents: "none",
          outline: `2px solid ${DEMO_JOURNAL.color}`,
          outlineOffset: -2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `0 ${MEM.card.paddingX}px ${MEM.card.paddingY}px`,
        }}
      >
        <p
          style={{
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: MEM.card.nameSize,
            fontWeight: 600,
            lineHeight: `${MEM.card.nameLineHeight}px`,
            color: "#ffffff",
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.05))",
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
            fontSize: MEM.card.descriptionSize,
            lineHeight: `${MEM.card.descriptionLineHeight}px`,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {DEMO_JOURNAL.description}
        </p>
      </div>
    </div>
  </div>
);

const NAV_ITEMS: Array<{ id: "entries" | "today" | "favorites"; icon: LucideIcon }> = [
  { id: "entries", icon: BookOpen },
  { id: "today", icon: CalendarDays },
  { id: "favorites", icon: Heart },
];

const QUICK_ACTIONS: Array<{ id: string; icon: LucideIcon; size: number }> = [
  { id: "save", icon: Save, size: 14 },
  { id: "newJournal", icon: Plus, size: 14 },
  { id: "addJournal", icon: FolderPlus, size: 15 },
  { id: "refresh", icon: RefreshCw, size: 14 },
];

const TASK_IDS = ["pending", "inProgress", "completed", "cancelled"] as const;

/**
 * A lateral de Memorias: acordeoes, e nao uma lista de secoes.
 *
 * A hierarquia e a do aplicativo: Cadernos (com o cartao de capa), Registros
 * (com as tres vistas do diario), Tags (com a contagem por tag) e Tarefas (com
 * a contagem por status). Pins fica preso no rodape, fora da area rolavel —
 * por isso ele nao rola junto com o resto.
 */
const MemoriesSidebar = ({
  palette,
  chrome,
  stacked = false,
}: {
  palette: Palette;
  chrome: StageChrome;
  /** Corpo empilhado: a lateral ocupa a largura toda, ganha altura propria e
   *  passa a fechar em baixo em vez de em cima da lista. */
  stacked?: boolean;
}) => (
  <nav
    aria-label={chrome.nav.journal}
    data-stage-part="memory-sidebar"
    style={{
      boxSizing: "border-box",
      width: stacked ? "100%" : MEM.navWidth,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      height: stacked ? STACK_SIDEBAR : undefined,
      overflow: "hidden",
      background: alpha(palette.ui, 0.25),
      color: palette.fg,
      borderRight: stacked ? "none" : `1px solid ${palette.border}`,
      borderBottom: stacked ? `1px solid ${palette.border}` : "none",
      fontFamily: "inherit",
    }}
  >
    <div
      style={{
        height: MEM.navHeader.height,
        boxSizing: "border-box",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        padding: `${MEM.navHeader.paddingY}px ${MEM.navHeader.paddingX}px`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          width: MEM.navHeader.button,
          height: MEM.navHeader.button,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: MEM.navHeader.buttonRadius,
          color: alpha(palette.fg, MEM.navHeader.colorAlpha),
        }}
      >
        <Menu size={MEM.navHeader.iconSize} strokeWidth={2} />
      </span>
    </div>

    <div style={{ padding: `0 ${MEM.ghost.paddingX}px ${MEM.primary.marginBottom + 4}px`, display: "grid", flex: "0 0 auto" }}>
      <span
        role="img"
        aria-label={chrome.nav.newEntry}
        style={{
          height: MEM.primary.height,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: MEM.primary.gap,
          /* Empilhado a lateral tem a largura da janela; sem teto o botao vira
           *  uma barra de 800px. O teto e o dobro da largura real da lateral. */
          maxWidth: stacked ? 360 : undefined,
          marginBottom: MEM.primary.marginBottom,
          padding: `${MEM.primary.paddingY}px ${MEM.primary.paddingX}px`,
          borderRadius: MEM.primary.radius,
          background: palette.accent,
          color: MEM.primary.color,
          fontSize: MEM.primary.fontSize,
          fontWeight: 600,
          lineHeight: `${MEM.primary.lineHeight}px`,
          whiteSpace: "nowrap",
        }}
      >
        <PenLine size={MEM.primary.iconSize} strokeWidth={2} aria-hidden="true" />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{chrome.nav.newEntry}</span>
      </span>

      <div
        style={{
          display: "grid",
          /* Empilhado, quatro botoes de icone esticados ate a largura da janela
           *  viram quatro barras vazias. Ali eles mantem o passo do app. */
          gridTemplateColumns: stacked ? "repeat(4, minmax(0, 56px))" : `repeat(${MEM.ghost.columns}, 1fr)`,
          gap: MEM.ghost.gap,
        }}
      >
        {QUICK_ACTIONS.map(({ id, icon: Icon, size }) => (
          <span
            key={id}
            aria-hidden="true"
            style={{
              height: MEM.ghost.height,
              display: "grid",
              placeItems: "center",
              borderRadius: MEM.ghost.radius,
              border: `${MEM.ghost.borderWidth}px solid ${palette.border}`,
              background: alpha(palette.bg, MEM.ghost.backgroundAlpha),
              color: alpha(palette.fg, MEM.ghost.colorAlpha),
            }}
          >
            <Icon size={size} strokeWidth={2} />
          </span>
        ))}
      </div>
    </div>

    <div className="no-scrollbar" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto" }}>
      <Accordion palette={palette} title={chrome.nav.journal}>
        <JournalCard palette={palette} chrome={chrome} />
      </Accordion>

      <Divider palette={palette} />

      <Accordion palette={palette} title={chrome.nav.sections.entries}>
        {NAV_ITEMS.map(({ id, icon: Icon }, index) => {
          const active = index === 0;
          return (
            <div
              key={id}
              data-stage-part="memory-section"
              style={{
                height: MEM.item.height,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: MEM.item.gap,
                padding: `${MEM.item.paddingY}px ${MEM.item.paddingX}px`,
                background: active ? alpha(palette.accent, MEM.item.activeAlpha) : "transparent",
                color: active ? palette.accent : alpha(palette.fg, MEM.item.inactiveAlpha),
                fontSize: MEM.item.fontSize,
                lineHeight: `${MEM.item.lineHeight}px`,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <Icon size={MEM.item.iconSize} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden="true" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{chrome.nav.sections[id]}</span>
            </div>
          );
        })}
      </Accordion>

      <Divider palette={palette} />

      <Accordion palette={palette} title={chrome.nav.sections.tags}>
        <div style={{ padding: `${MEM.tags.paddingY}px ${MEM.tags.paddingX}px` }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: MEM.tags.gap,
              maxHeight: MEM.tags.maxLines * MEM.tags.lineStep,
              overflow: "hidden",
            }}
          >
            {NOTEBOOK_TAGS.map(({ tag, count }) => (
              <span
                key={tag}
                style={{
                  height: MEM.tags.chip.height,
                  boxSizing: "border-box",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: MEM.tags.chip.gap,
                  padding: `${MEM.tags.chip.paddingY}px ${MEM.tags.chip.paddingX}px`,
                  borderRadius: MEM.tags.chip.radius,
                  border: "1px solid transparent",
                  background: alpha(palette.accent, MEM.tags.chip.backgroundAlpha),
                  color: alpha(palette.fg, MEM.tags.chip.colorAlpha),
                  fontSize: MEM.tags.chip.fontSize,
                  lineHeight: `${MEM.tags.chip.lineHeight}px`,
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
                <span style={{ fontVariantNumeric: "tabular-nums", opacity: MEM.tags.chip.countAlpha }}>{count}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: MEM.tags.more.marginTop }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: MEM.tags.chip.gap,
                fontSize: MEM.tags.more.fontSize,
                fontWeight: 500,
                lineHeight: `${MEM.tags.more.lineHeight}px`,
                color: alpha(palette.fg, MEM.tags.more.colorAlpha),
              }}
            >
              {chrome.more}
              <ChevronDown size={10} strokeWidth={2} />
            </span>
          </div>
        </div>
      </Accordion>

      <Divider palette={palette} />

      <Accordion palette={palette} title={chrome.nav.sections.tasks}>
        <div style={{ padding: `${MEM.tasks.paddingY}px ${MEM.tasks.paddingX}px`, display: "grid", gap: MEM.tasks.gap }}>
          {TASK_IDS.map((id) => {
            const count = NOTEBOOK_TASKS.find((task) => task.status === (id === "inProgress" ? "in_progress" : id))?.count ?? 0;
            return (
              <span
                key={id}
                style={{
                  height: MEM.tasks.row.height,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: MEM.tasks.row.gap,
                  padding: `${MEM.tasks.row.paddingY}px ${MEM.tasks.row.paddingX}px`,
                  borderRadius: MEM.tasks.row.radius,
                  color: alpha(palette.fg, MEM.tasks.row.colorAlpha),
                  fontSize: MEM.tasks.row.fontSize,
                  lineHeight: `${MEM.tasks.row.lineHeight}px`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: MEM.tasks.row.dot,
                    height: MEM.tasks.row.dot,
                    borderRadius: 9999,
                    background: palette.border,
                  }}
                />
                <span style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {chrome.tasks[id]}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: alpha(palette.fg, MEM.tasks.row.countAlpha) }}>{count}</span>
              </span>
            );
          })}
          <p style={{ margin: 0, padding: "4px 8px", fontSize: MEM.tasks.emptyFontSize, lineHeight: "16.5px", color: alpha(palette.fg, 0.33) }}>
            {chrome.tasks.empty}
          </p>
        </div>
      </Accordion>
    </div>

    {/* Rodape: Pins fica fora da area rolavel, preso na base da lateral. */}
    <div style={{ flex: "0 0 auto", borderTop: `1px solid ${palette.border}` }}>
      <Accordion palette={palette} title={chrome.nav.sections.pins}>
        <div style={{ margin: `${MEM.divider.marginY}px ${MEM.pins.panelPaddingX}px` }}>
          <div style={{ height: 24, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <Settings2 size={13} strokeWidth={2} style={{ color: alpha(palette.fg, 0.33) }} aria-hidden="true" />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              boxSizing: "border-box",
              padding: MEM.pins.switcher.padding,
              marginBottom: 8,
              borderRadius: MEM.pins.switcher.radius,
              border: `1px solid ${palette.border}`,
              background: alpha(palette.fg, 0.04),
            }}
          >
            {[chrome.pins.day, chrome.pins.week, chrome.pins.month, chrome.pins.all].map((label, index) => (
              <span
                key={label}
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: "4px 4px",
                  borderRadius: 4,
                  background: index === 2 ? alpha(palette.accent, 0.13) : "transparent",
                  color: index === 2 ? palette.accent : alpha(palette.fg, 0.44),
                  fontSize: MEM.pins.switcher.fontSize,
                  fontWeight: 500,
                  lineHeight: `${MEM.pins.switcher.lineHeight}px`,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {NOTEBOOK_PINS.map(({ id, label, value, color, pct }) => {
              const Icon = id === "words" ? PenLine : id === "entries" ? Inbox : Activity;
              return (
                <div key={id} style={{ borderRadius: 6, padding: "2px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px" }}>
                    <span style={{ flex: "0 0 auto", color }} aria-hidden="true">
                      <Icon size={13} strokeWidth={2} />
                    </span>
                    <span
                      style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: MEM.pins.row.labelSize,
                        lineHeight: `${MEM.pins.row.labelLineHeight}px`,
                        color: alpha(palette.fg, 0.67),
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ flex: "0 0 auto", fontSize: MEM.pins.row.valueSize, fontWeight: 500, lineHeight: `${MEM.pins.row.valueLineHeight}px`, color: palette.fg }}>
                      {value}
                    </span>
                  </div>
                  {pct === undefined ? null : (
                    <div style={{ margin: "4px 6px 0", height: 2, overflow: "hidden", borderRadius: 9999, background: palette.border }}>
                      <div style={{ height: "100%", width: `${Math.min(Math.max(pct, 0), 1) * 100}%`, borderRadius: 9999, background: color }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Accordion>
    </div>
  </nav>
);

/* ---------------------------------------------------------------------------
 * Painel do meio: cabecalho do caderno + vistas + busca + registros por mes
 * ------------------------------------------------------------------------ */

const monthLabel = (locale: Locale, iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" });

const shortMonth = (locale: Locale, iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { month: "short" });

const dayNumber = (iso: string) => Number(iso.slice(8, 10));

/** Agrupa por ano-mes preservando a ordem (mais novo primeiro), como o app. */
const groupByMonth = (records: typeof NOTEBOOK_RECORDS) => {
  const groups: Array<{ key: string; records: typeof NOTEBOOK_RECORDS }> = [];
  for (const record of records) {
    const key = record.date.slice(0, 7);
    const group = groups.find((entry) => entry.key === key);
    if (group) group.records.push(record);
    else groups.push({ key, records: [record] });
  }
  return groups;
};

const VIEW_IDS = ["list", "calendar", "gallery", "places"] as const;
const VIEW_ICONS: Record<(typeof VIEW_IDS)[number], LucideIcon> = {
  list: FileText,
  calendar: CalendarDays,
  gallery: ImageIcon,
  places: MapPin,
};

const RecordListPanel = ({
  palette,
  chrome,
  locale,
  stacked = false,
}: {
  palette: Palette;
  chrome: StageChrome;
  locale: Locale;
  stacked?: boolean;
}) => (
  <section
    aria-label={chrome.nav.journal}
    data-stage-part="memory-list"
    style={{
      boxSizing: "border-box",
      width: stacked ? "100%" : J.panelWidth,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      height: stacked ? STACK_LIST : undefined,
      overflow: "hidden",
      borderRight: stacked ? "none" : `1px solid ${palette.border}`,
      borderBottom: stacked ? `1px solid ${palette.border}` : "none",
      background: palette.bg,
      color: palette.fg,
    }}
  >
    <div
      style={{
        padding: `${J.header.paddingY}px ${J.header.paddingX}px`,
        borderBottom: `1px solid ${palette.border}`,
        display: "grid",
        gap: J.header.gap,
        background: palette.bg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: J.header.iconBox,
              height: J.header.iconBox,
              flex: "0 0 auto",
              display: "grid",
              placeItems: "center",
              borderRadius: J.header.iconRadius,
              background: alpha(palette.accent, J.header.iconBackgroundAlpha),
              color: palette.accent,
            }}
          >
            <BookOpen size={J.header.iconSize} strokeWidth={2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: J.header.nameSize,
                fontWeight: 600,
                lineHeight: `${J.header.nameLineHeight}px`,
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
                fontSize: J.header.descriptionSize,
                lineHeight: `${J.header.descriptionLineHeight}px`,
                color: alpha(palette.fg, J.header.descriptionAlpha),
              }}
            >
              {DEMO_JOURNAL.description}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
          {[Download, FileText].map((Icon, index) => (
            <span
              key={index}
              aria-hidden="true"
              style={{
                width: J.header.actionButton,
                height: J.header.actionButton,
                display: "grid",
                placeItems: "center",
                borderRadius: 4,
                color: alpha(palette.fg, J.header.actionAlpha),
              }}
            >
              <Icon size={J.header.actionIcon} strokeWidth={2} />
            </span>
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label={chrome.views.list}
        style={{
          display: "flex",
          alignItems: "center",
          gap: J.switcher.gap,
          padding: J.switcher.padding,
          borderRadius: J.switcher.radius,
          background: palette.ui,
        }}
      >
        {VIEW_IDS.map((id, index) => {
          const Icon = VIEW_ICONS[id];
          const active = index === 0;
          return (
            <span
              key={id}
              role="tab"
              aria-selected={active}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                height: J.switcher.height - J.switcher.padding * 2,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: J.switcher.itemGap,
                padding: `${J.switcher.itemPaddingY}px ${J.switcher.itemPaddingX}px`,
                borderRadius: J.switcher.itemRadius,
                background: active ? palette.bg : "transparent",
                color: active ? palette.accent : alpha(palette.fg, J.switcher.inactiveAlpha),
                boxShadow: active ? J.switcher.activeShadow : "none",
                fontSize: J.switcher.itemFontSize,
                fontWeight: 500,
                lineHeight: `${J.switcher.itemLineHeight}px`,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <Icon size={J.switcher.iconSize} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden="true" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{chrome.views[id]}</span>
            </span>
          );
        })}
      </div>
    </div>

    <div style={{ padding: `${J.search.paddingY}px ${J.search.paddingX}px`, borderBottom: `1px solid ${palette.border}` }}>
      <div
        style={{
          height: J.search.height,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: J.search.gap,
          padding: `${J.search.fieldPaddingY}px ${J.search.fieldPaddingX}px`,
          borderRadius: J.search.radius,
          background: palette.ui,
          color: alpha(palette.fg, J.search.colorAlpha),
        }}
      >
        <Search size={J.search.iconSize} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden="true" />
        <span style={{ flex: "1 1 0", minWidth: 0, fontSize: J.search.fontSize, lineHeight: `${J.search.lineHeight}px`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {chrome.listSearch}
        </span>
        <span
          aria-hidden="true"
          style={{ width: J.search.actionBox, height: J.search.actionBox, display: "grid", placeItems: "center", flex: "0 0 auto" }}
        >
          <Download size={J.search.iconSize} strokeWidth={2} />
        </span>
      </div>
    </div>

    <div className="no-scrollbar" style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ height: J.list.filterRowHeight, boxSizing: "border-box", borderBottom: `1px solid ${palette.border}`, background: palette.ui }} />
        {groupByMonth(NOTEBOOK_RECORDS).map((group) => (
          <div key={group.key}>
            <p
              data-stage-part="memory-month"
              style={{
                margin: 0,
                height: J.list.monthHeight,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: `${J.list.monthPaddingY}px ${J.list.monthPaddingX}px`,
                borderBottom: `1px solid ${palette.border}`,
                background: palette.ui,
                color: alpha(palette.fg, J.list.monthAlpha),
                fontSize: J.list.monthFontSize,
                fontWeight: 600,
                lineHeight: `${J.list.monthLineHeight}px`,
                letterSpacing: J.list.tracking,
                textTransform: "uppercase",
              }}
            >
              <ChevronDown size={J.list.chevron} strokeWidth={2} style={{ flex: "0 0 auto" }} aria-hidden="true" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {monthLabel(locale, group.records[0].date)}
              </span>
              <span style={{ marginLeft: "auto", fontSize: J.list.countSize, fontWeight: 400, opacity: J.list.countAlpha }}>
                {group.records.length}
              </span>
            </p>
            {group.records.map((record) => (
              <div
                key={record.date}
                data-stage-part="memory-record"
                style={{
                  height: J.list.rowHeight,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: J.list.rowGap,
                  padding: `${J.list.rowPaddingY}px ${J.list.rowPaddingX}px`,
                  borderBottom: `1px solid ${palette.border}`,
                  background: record.active ? alpha(palette.accent, J.list.selectedAlpha) : "transparent",
                }}
              >
                <div
                  style={{
                    width: J.list.dateWidth,
                    flex: "0 0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 2,
                  }}
                >
                  <span style={{ fontSize: J.list.daySize, fontWeight: 700, lineHeight: `${J.list.dayLineHeight}px` }}>
                    {dayNumber(record.date)}
                  </span>
                  <span
                    style={{
                      fontSize: J.list.monthSize,
                      fontWeight: 500,
                      lineHeight: `${J.list.shortMonthLineHeight}px`,
                      textTransform: "uppercase",
                      color: alpha(palette.fg, J.list.shortMonthAlpha),
                    }}
                  >
                    {shortMonth(locale, record.date)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 0" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    {record.mood ? <span style={{ fontSize: 14, lineHeight: "20px", flex: "0 0 auto" }}>{MOOD_EMOJI[record.mood]}</span> : null}
                    <span
                      style={{
                        fontSize: J.list.titleSize,
                        fontWeight: 500,
                        lineHeight: `${J.list.titleLineHeight}px`,
                        color: record.active ? palette.accent : palette.fg,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.title}
                    </span>
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: J.list.summarySize,
                      lineHeight: `${J.list.summaryLineHeight}px`,
                      color: alpha(palette.fg, J.list.summaryAlpha),
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {record.summary}
                  </p>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 10,
                      lineHeight: "14px",
                      color: alpha(palette.fg, 0.25),
                    }}
                  >
                    {record.hasImage ? <ImageIcon size={10} strokeWidth={2} aria-hidden="true" /> : null}
                    <span>{record.words}w</span>
                  </span>
                </div>
                {record.hasImage ? (
                  <span
                    aria-hidden="true"
                    style={{
                      width: J.list.thumb,
                      height: J.list.thumb,
                      flex: "0 0 auto",
                      marginTop: 2,
                      borderRadius: 4,
                      overflow: "hidden",
                      background: alpha(palette.accent, 0.1),
                    }}
                  >
                    {record.active ? (
                      <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ---------------------------------------------------------------------------
 * Painel da entrada: capa, cabecalho e o corpo dividido (codigo | visualizacao)
 * ------------------------------------------------------------------------ */

const MetaChip = ({
  palette,
  icon,
  label,
  active,
}: {
  palette: Palette;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) => (
  <span
    style={{
      height: J.entry.chipHeight,
      boxSizing: "border-box",
      display: "inline-flex",
      alignItems: "center",
      gap: J.entry.chipGap,
      padding: `${J.entry.chipPaddingY}px ${J.entry.chipPaddingX}px`,
      borderRadius: J.entry.chipRadius,
      border: "1px solid transparent",
      background: active ? alpha(palette.accent, J.entry.chipActiveAlpha) : palette.ui,
      color: active ? palette.accent : alpha(palette.fg, J.entry.chipIdleAlpha),
      fontSize: J.entry.chipFontSize,
      fontWeight: 500,
      lineHeight: `${J.entry.chipLineHeight}px`,
      whiteSpace: "nowrap",
    }}
  >
    {icon}
    <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
  </span>
);


/** A coluna de leitura do corpo: o bloco METADADOS e o texto do registro. */
const PreviewPane = ({ palette, chrome }: { palette: Palette; chrome: StageChrome }) => (
  <div data-stage-part="memory-preview" style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, overflow: "hidden", background: palette.bg, padding: J.split.previewPadding }}>
    <div
      style={{
        boxSizing: "border-box",
        overflow: "hidden",
        padding: J.split.surfacePadding,
        border: `${J.split.surfaceBorder}px solid ${alpha(palette.fg, 0.16)}`,
        borderRadius: J.split.surfaceRadius,
        background: palette.editorBg,
        color: palette.editorFg,
        boxShadow: "0 8px 18px rgba(2,6,23,0.06), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <div
        data-stage-part="memory-metadata"
        style={{
          padding: J.split.metadata.padding,
          marginBottom: J.split.metadata.marginBottom,
          borderRadius: J.split.metadata.radius,
          border: `1px solid ${alpha(palette.fg, 0.18)}`,
          background: alpha(palette.fg, 0.06),
          color: alpha(palette.fg, 0.72),
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: J.split.metadata.titleSize,
            fontWeight: J.split.metadata.titleWeight,
            lineHeight: `${J.split.metadata.titleLineHeight}px`,
            letterSpacing: J.split.metadata.titleTracking,
            textTransform: "uppercase",
          }}
        >
          {chrome.metadata}
        </p>
        <dl
          style={{
            margin: 0,
            marginTop: 8,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: J.split.metadata.rowGapX,
            rowGap: 4,
          }}
        >
          <dt
            style={{
              fontSize: J.split.metadata.rowSize,
              fontWeight: 600,
              lineHeight: `${J.split.metadata.rowLineHeight}px`,
              textTransform: "capitalize",
            }}
          >
            title
          </dt>
          <dd style={{ margin: 0, fontSize: J.split.metadata.rowSize, lineHeight: `${J.split.metadata.rowLineHeight}px`, color: palette.fg }}>
            {RECORD.title}
          </dd>
        </dl>
      </div>

      <div style={{ fontSize: J.split.prose.pSize, lineHeight: `${J.split.prose.pLineHeight}px`, fontWeight: J.split.prose.pWeight }}>
        {PREVIEW.lead ? <p style={{ margin: 0, marginBottom: J.split.prose.pMarginBottom }}>{PREVIEW.lead}</p> : null}
        {PREVIEW.sections.map((section) => (
          <section key={section.heading} style={{ marginTop: J.split.prose.h2MarginTop }}>
            <h2
              style={{
                margin: 0,
                marginBottom: J.split.prose.h2MarginBottom,
                fontSize: J.split.prose.h2Size,
                fontWeight: J.split.prose.h2Weight,
                lineHeight: `${J.split.prose.h2LineHeight}px`,
                letterSpacing: J.split.prose.h2Tracking,
                /* Uma palavra longa ("Observação" a 37px) nao quebra sozinha: em
                 * painel estreito ela vazava para fora. `anywhere` deixa quebrar
                 * em vez de sair da caixa. */
                overflowWrap: "anywhere",
              }}
            >
              <a
                href={`#${section.heading.toLowerCase()}`}
                style={{
                  color: palette.accent,
                  fontWeight: J.split.prose.linkWeight,
                  textDecorationLine: "underline",
                  textDecorationThickness: J.split.prose.linkUnderline,
                  textUnderlineOffset: "0.18em",
                }}
              >
                {section.heading}
              </a>
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ margin: 0, marginBottom: J.split.prose.pMarginBottom }}>
                {paragraph}
              </p>
            ))}
            {section.bullets.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  marginBottom: 22,
                  paddingLeft: J.split.prose.listIndent,
                  fontSize: J.split.prose.pSize,
                  fontWeight: J.split.prose.listWeight,
                  lineHeight: `${J.split.prose.listLineHeight}px`,
                }}
              >
                {section.bullets.map((bullet) => (
                  <li key={bullet} style={{ marginTop: 8 }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  </div>
);

const EntryPane = ({ palette, chrome, locale, compact }: { palette: Palette; chrome: StageChrome; locale: Locale; compact: boolean }) => {
  const chips = [
    { id: "tags", icon: <Tag size={J.entry.chipIcon} strokeWidth={2} />, label: RECORD.tags.slice(0, 2).join(", "), active: true },
    { id: "mood", icon: <span style={{ fontSize: 14, lineHeight: "14px" }}>{MOOD_EMOJI.excited}</span>, label: "excited", active: true },
    { id: "tasks", icon: <ListTodo size={J.entry.chipIcon} strokeWidth={2} />, label: chrome.nav.sections.tasks },
    { id: "places", icon: <MapPin size={J.entry.chipIcon} strokeWidth={2} />, label: chrome.views.places },
    { id: "fields", icon: <Copy size={J.entry.chipIcon} strokeWidth={2} />, label: "Campos" },
    { id: "pins", icon: <Activity size={J.entry.chipIcon} strokeWidth={2} />, label: `3 ${chrome.pins.count}`, active: true },
  ];

  return (
    <div style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", background: palette.bg }} data-stage-part="memory-entry">
      <div style={{ position: "relative", width: "100%", height: J.entry.coverHeight, flex: "0 0 auto", overflow: "hidden", background: palette.bg }}>
        <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      <div
        data-stage-part="memory-entry-header"
        style={{
          padding: `${J.entry.paddingY}px ${J.entry.paddingX}px`,
          borderBottom: `1px solid ${palette.border}`,
          display: "grid",
          gap: J.entry.chipsMarginTop,
          flex: "0 0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "grid", gap: 4, minWidth: 0, flex: "1 1 0" }}>
            <p
              style={{
                margin: 0,
                fontSize: J.entry.eyebrowSize,
                fontWeight: 500,
                lineHeight: `${J.entry.eyebrowLineHeight}px`,
                letterSpacing: J.entry.tracking,
                textTransform: "uppercase",
                color: alpha(palette.fg, J.entry.eyebrowAlpha),
                /* Na leitura empilhada a caixa tem a largura do telefone: ali o
                 *  texto quebra em vez de terminar em reticencias — o registro
                 *  aberto e o conteudo essencial do palco, e um titulo cortado
                 *  em "Nebul..." nao diz qual registro esta aberto. */
                overflow: "hidden",
                textOverflow: compact ? "clip" : "ellipsis",
                whiteSpace: compact ? "normal" : "nowrap",
                overflowWrap: "break-word",
              }}
            >
              {DEMO_JOURNAL.name} · {new Date(`${RECORD.date}T12:00:00`).toLocaleDateString(locale)}
            </p>
            <p
              style={{
                margin: 0,
                /* Na leitura empilhada a caixa tem a largura do telefone: ali o
                 *  corpo desce um degrau (24 -> 20) para "Nebulosa" caber numa
                 *  linha em vez de quebrar no meio da palavra. */
                fontSize: compact ? 20 : J.entry.titleSize,
                fontWeight: J.entry.titleWeight,
                lineHeight: `${J.entry.titleLineHeight}px`,
                letterSpacing: J.entry.titleTracking,
                overflow: "hidden",
                textOverflow: compact ? "clip" : "ellipsis",
                whiteSpace: compact ? "normal" : "nowrap",
                overflowWrap: "break-word",
              }}
            >
              {RECORD.title}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: J.entry.actionGap, flex: "0 0 auto" }}>
            {[Heart, Info, MoreHorizontal].map((Icon, index) => (
              <span
                key={index}
                aria-hidden="true"
                style={{
                  width: J.entry.actionButton,
                  height: J.entry.actionButton,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 4,
                  color: alpha(palette.fg, J.entry.chipIdleAlpha),
                }}
              >
                <Icon size={15} strokeWidth={2} />
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: J.entry.chipGap, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <MetaChip key={chip.id} palette={palette} icon={chip.icon} label={chip.label} active={chip.active} />
          ))}
          <span style={{ flex: "1 1 0" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: J.entry.chipFontSize, lineHeight: `${J.entry.chipLineHeight}px`, color: alpha(palette.fg, J.entry.chipIdleAlpha) }}>
            <ImageIcon size={J.entry.chipIcon} strokeWidth={2} aria-hidden="true" />1
          </span>
          <span style={{ fontSize: J.entry.chipFontSize, lineHeight: `${J.entry.chipLineHeight}px`, color: alpha(palette.fg, J.entry.wordsAlpha) }}>
            {WORD_COUNT} {chrome.words}
          </span>
        </div>
      </div>

      <div style={{ flex: "1 1 0", minHeight: 0, display: "flex" }}>
        <div data-stage-part="memory-code" style={{ width: compact ? "100%" : "50%", minWidth: 0, display: "flex", borderRight: compact ? "none" : `1px solid ${palette.border}` }}>
          <CodePane palette={palette} segments={tokenize(BODY_LINES)} activeLine gutter />
        </div>
        {compact ? null : <PreviewPane palette={palette} chrome={chrome} />}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * O palco
 * ------------------------------------------------------------------------ */

/** A medida real da janela do aplicativo: 1440x900 (16:10). */
const STAGE_WIDTH = 1440;
const STAGE_HEIGHT = 900;
/** Abaixo disto a escala deixaria o texto abaixo de ~10px. */
const STAGE_MIN_SCALED = 920;

/**
 * Altura da janela quando o desenho NAO cabe em escala (moldura estreita).
 *
 * Ali as colunas de Memorias nao tem 1240 para existir lado a lado, e o palco
 * deixa de ser um desenho reduzido para ser a janela no tamanho natural com o
 * corpo EMPILHADO — lateral, lista, leitura, a ordem do aplicativo. A caixa
 * precisa de altura para as tres; o editor nao, e por isso as duas alturas sao
 * diferentes: empilhar tres paineis e mais alto do que um painel de codigo.
 */
const STAGE_STACK_EDITOR = 736;
const STAGE_STACK_MEMORIES = 1560;
/** Reparte do corpo empilhado: a lateral e a lista tem altura propria e a
 *  leitura fica com o resto (o app tambem da a ela o espaco que sobra).
 *
 *  As duas alturas sao escolhidas para o corte cair num limite de conteudo, e
 *  nao no meio de uma linha: a lateral termina depois do segundo item de
 *  Registros (44 + 88 + 221 + 203) e a lista depois do segundo registro de
 *  Outubro (cabecalho + busca + 17 + 33,5 + 76 + 33,5 + 76). Assim o painel
 *  empilhado le como painel, nao como recorte. */
const STACK_SIDEBAR = 556;
const STACK_LIST = 383;

/**
 * A moldura do palco: um container que ocupa 100% do `measure` e um desenho de
 * 1440x900 escalado por `transform` — ou, quando nao ha largura para a escala
 * ser legivel, a janela no tamanho natural com o corpo empilhado.
 *
 * Escala e nao reflow, de proposito: reflowar para 1088 mudaria as quebras de
 * linha e as colunas do aplicativo (240/380 viram 57% da largura), que e
 * exatamente o que a recriacao precisa preservar. Com `scale` o desenho e o
 * mesmo de 1440 — mesmas colunas, mesmas linhas, mesmas alturas — so que
 * proporcional ao container.
 *
 * `useLayoutEffect` para medir antes da primeira pintura: sem isso a janela
 * apareceria um frame no tamanho errado.
 */
const StageFrame = ({
  panelId,
  tabId,
  stackedHeight,
  children,
}: {
  panelId: string;
  /** Aba que nomeia o painel — `aria-controls` da aba aponta para `panelId`. */
  tabId: string;
  /** Altura da caixa quando o desenho vai no tamanho natural (empilhado). */
  stackedHeight: number;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scaled = width >= STAGE_MIN_SCALED;
  const scale = scaled ? width / STAGE_WIDTH : 1;
  const height = scaled ? width / (STAGE_WIDTH / STAGE_HEIGHT) : stackedHeight;

  return (
    /* Tres camadas com papeis distintos, e a separacao e o desenho:
     *  `stage-veil` cobre a viewport inteira (o modo de concentracao),
     *  `stage-focus__zoom` escala (nunca o `window-scaler`, que ja gasta o
     *  `transform` na reducao de 1440) e `window-frame` e a janela.
     *  `data-stage-scaled` publica a decisao de empilhamento para o CSS: a janela
     *  empilhada nao cresce. */
    <div
      className="stage-focus"
      data-stage-part="stage-focus"
      data-stage-scaled={scaled ? "true" : "false"}
    >
      <StageVeil frameRef={ref} />
      <div className="stage-focus__zoom">
        <span
          className="stage-focus__shade"
          aria-hidden="true"
          /* O raio da camada de sombra e o raio da janela: mesma fonte, para a
           *  sombra nunca "descolar" no canto. */
          style={{ borderRadius: APP_METRICS.windowRadius }}
        />
        <div
          ref={ref}
          data-stage-part="window-frame"
          style={{ width: "100%", height, overflow: "hidden", borderRadius: APP_METRICS.windowRadius }}
          className="stage-focus__frame shadow-[0_20px_50px_-30px_rgba(0,0,0,0.55)]"
        >
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            /* O painel nao tem elemento focavel dentro — a pratica WAI-ARIA manda
             *  dar `tabindex="0"` a ele. E o que da paridade de teclado ao efeito
             *  de concentracao: `:focus-within` so existe se algo la dentro puder
             *  receber o foco. */
            tabIndex={0}
            data-stage-part="window-scaler"
            style={{
              width: scaled ? STAGE_WIDTH : width || "100%",
              height: scaled ? STAGE_HEIGHT : stackedHeight,
              transform: scaled ? `scale(${scale})` : undefined,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StageProps {
  locale: Locale;
}

/**
 * Palco: o mesmo registro em tres leituras sobre a janela real do aplicativo.
 *
 * A janela e a mesma nas tres abas — barra de titulo, faixa de acoes e barra de
 * status saem de um componente so, com as medidas do DOM do aplicativo
 * (`app-metrics.ts`). Trocar de leitura troca o corpo, nao o cromo.
 *
 * A caixa tem altura fixa de proposito: trocar de aba nao desloca nada abaixo.
 * O corpo rola por dentro (sem barra visivel), como o aplicativo faz na janela
 * estreita.
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
   * O que muda entre as duas leituras e o **corpo**, nao a moldura: barra de
   * titulo, faixa de acoes e barra de status sao as mesmas nas duas. Em
   * Memorias troca-se o corpo inteiro e a faixa de abas sai, porque o
   * aplicativo tambem nao a mostra no modo Memorias.
   *
   * Uma terceira leitura existiu e saiu: o Editor ja mostra o markdown numerado
   * por linha, entao ela era a mesma coisa sem o realce.
   */
  /**
   * Duas condicoes mandam empilhar:
   *
   * 1. a do aplicativo — abaixo de 820px de janela (`compactLayout`, medido);
   * 2. a do desenho — abaixo de 1240px, porque a lateral (240) e a lista (380)
   *    sao fixas e a entrada precisa de DOIS paineis legiveis. Com 1040 a
   *    entrada ficava com 420 (dois paineis de 210) e a leitura virava uma
   *    coluna de cinco palavras por linha. Ali o app real tambem espreme, mas
   *    espremer no palco nao e fidelidade: e um print que ninguem consegue ler.
   *
   * Empilhar NAO e jogar coluna fora. A versao anterior mostrava so a entrada e
   * sumia com a lateral e a lista — a hierarquia do aplicativo (lateral, lista,
   * leitura) desaparecia justamente onde ela precisa ser lida de cima para
   * baixo. Agora as tres descem na ordem do app, cada uma na largura toda, com
   * altura propria (`STACK_SIDEBAR`, `STACK_LIST`) e a leitura com o resto.
   */
  const memoriesBody = ({ width }: WindowContext) => {
    const stacked = width > 0 && width < 1240;

    if (!stacked) {
      return (
        <>
          <MemoriesSidebar palette={PALETTE} chrome={chrome} />
          <RecordListPanel palette={PALETTE} chrome={chrome} locale={locale} />
          <EntryPane palette={PALETTE} chrome={chrome} locale={locale} compact={false} />
        </>
      );
    }

    return (
      <div
        data-stage-part="memory-stack"
        style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 0, minHeight: 0 }}
      >
        <MemoriesSidebar palette={PALETTE} chrome={chrome} stacked />
        <RecordListPanel palette={PALETTE} chrome={chrome} locale={locale} stacked />
        {/* A leitura so vira coluna unica quando nao ha largura para os dois
         *  paineis dela; acima de 700 o par codigo|previa continua. */}
        <EntryPane palette={PALETTE} chrome={chrome} locale={locale} compact={width < 700} />
      </div>
    );
  };

  return (
    <section
      id="leituras"
      aria-labelledby="leituras-titulo"
      className="margins-stage relative border-b border-stage-rule bg-stage text-stage-foreground"
    >
      {/* UMA `.measure` para a secao inteira, com a REGUA no proprio container.
       *  Antes cada bloco (cabecalho, janela, legendas) desenhava o seu
       *  `border-l`: a regua virava tres segmentos com emendas — e o bloco da
       *  janela, que tinha container proprio, era o que aparecia por cima dela.
       *  Agora a regua e uma so, do topo ao rodape do palco, e todo o conteudo
       *  (titulo, abas, janela, legendas) fica DENTRO do padding dela. */}
      <div className="measure border-l border-stage-accent/30 px-6 lg:px-10">
        <div className="pt-20 lg:pt-28">
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

        {/* A JANELA VIVE DENTRO DA COLUNA DE CONTEUDO — sem container proprio e
         *  sem `border-l`: a regua e do `measure` acima e corre continua ao lado.
         *
         *  O desenho do aplicativo e 1440x900 (a medida real). Como 1007 nao
         *  comporta tres colunas em tamanho natural, o desenho e ESCALADO — nao
         *  reflowado: `transform: scale(medida/1440)` mantem exatamente as mesmas
         *  quebras de linha, as mesmas colunas (240/380/820) e as mesmas alturas,
         *  so que proporcionais ao container. Abaixo de 920 a escala deixaria o
         *  cromo em ~7px, e ali o palco volta ao tamanho natural com o layout
         *  compacto do app (uma coluna, 16px) — com as colunas de Memorias
         *  EMPILHADAS, nunca descartadas. */}
        <div className="mt-6">
          <StageFrame
            panelId={`painel-${view}`}
            tabId={`aba-${view}`}
            stackedHeight={view === "memories" ? STAGE_STACK_MEMORIES : STAGE_STACK_EDITOR}
          >
            <AppWindow
              {...windowProps}
              mode={view === "memories" ? "memories" : "editor"}
              draft={view === "memories" ? chrome.draft : undefined}
              statusView={view === "memories" ? "split" : "edit"}
              statusFile={view === "memories" ? "Untitled.md" : undefined}
            >
              {view === "memories" ? memoriesBody : undefined}
            </AppWindow>
          </StageFrame>
        </div>

        <div className="pb-20 lg:pb-28">
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
        </div>
      </div>
    </section>
  );
};

export default Stage;
