import { ReactNode, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Locale } from "@/i18n";

interface MockupCopy {
  explorer: string;
  statusMarkdown: string;
  statusCursor: string;
  splitModes: [string, string, string];
  splitTitle: string;
  splitDescriptionA: string;
  splitDescriptionB: string;
  exportTitle: string;
  exportButton: string;
  cancelButton: string;
  workspaceTitle: string;
  filesLabel: string;
  snippetsTitle: string;
  snippetsCreate: string;
  snippetsStatus: string;
  commandTitle: string;
  commandHint: string;
  focusTitle: string;
  focusSubtitle: string;
  previewTitle: string;
  previewDescription: string;
}

const mockupCopy: Record<Locale, MockupCopy> = {
  "pt-BR": {
    explorer: "Explorer",
    statusMarkdown: "Markdown",
    statusCursor: "Ln 12, Col 18",
    splitModes: ["Editar", "Split", "Preview"],
    splitTitle: "Guia rápido",
    splitDescriptionA: "Abra sua pasta",
    splitDescriptionB: "e escreva sem sair do fluxo.",
    exportTitle: "Exportar documento",
    exportButton: "Exportar",
    cancelButton: "Cancelar",
    workspaceTitle: "Workspace",
    filesLabel: "9 arquivos",
    snippetsTitle: "Snippets de modelos",
    snippetsCreate: "Criar novo",
    snippetsStatus: "4 modelos ativos",
    commandTitle: "Command palette",
    commandHint: "Buscar ações, arquivos e snippets",
    focusTitle: "Modo Foco",
    focusSubtitle: "Texto centralizado · ruído visual reduzido",
    previewTitle: "Preview Presets",
    previewDescription: "Preset atual: Technical Doc",
  },
  "en-US": {
    explorer: "Explorer",
    statusMarkdown: "Markdown",
    statusCursor: "Ln 12, Col 18",
    splitModes: ["Edit", "Split", "Preview"],
    splitTitle: "Quick guide",
    splitDescriptionA: "Open your workspace",
    splitDescriptionB: "and keep writing without context loss.",
    exportTitle: "Export document",
    exportButton: "Export",
    cancelButton: "Cancel",
    workspaceTitle: "Workspace",
    filesLabel: "9 files",
    snippetsTitle: "Model snippets",
    snippetsCreate: "Create new",
    snippetsStatus: "4 active models",
    commandTitle: "Command palette",
    commandHint: "Search actions, files, and snippets",
    focusTitle: "Focus Mode",
    focusSubtitle: "Centered text · reduced visual noise",
    previewTitle: "Preview Presets",
    previewDescription: "Current preset: Technical Doc",
  },
  "es-ES": {
    explorer: "Explorador",
    statusMarkdown: "Markdown",
    statusCursor: "Ln 12, Col 18",
    splitModes: ["Editar", "Split", "Preview"],
    splitTitle: "Guía rápida",
    splitDescriptionA: "Abre tu workspace",
    splitDescriptionB: "y escribe sin perder contexto.",
    exportTitle: "Exportar documento",
    exportButton: "Exportar",
    cancelButton: "Cancelar",
    workspaceTitle: "Workspace",
    filesLabel: "9 archivos",
    snippetsTitle: "Snippets de modelos",
    snippetsCreate: "Crear nuevo",
    snippetsStatus: "4 modelos activos",
    commandTitle: "Command palette",
    commandHint: "Busca acciones, archivos y snippets",
    focusTitle: "Modo Foco",
    focusSubtitle: "Texto centrado · menos ruido visual",
    previewTitle: "Presets de Preview",
    previewDescription: "Preset actual: Technical Doc",
  },
};

const sampleTree = [
  "[DIR] docs",
  "  [MD] readme.md",
  "  [MD] guia.md",
  "[DIR] drafts",
  "  [MD] release-notes.md",
  "[DIR] snippets",
  "  [MD] modelos.md",
  "[MD] changelog.md",
];

interface WorkspaceItem {
  name: string;
  type: "folder" | "file";
  level: number;
  active?: boolean;
}

const workspaceItems: WorkspaceItem[] = [
  { name: "project-docs", type: "folder", level: 0 },
  { name: "readme.md", type: "file", level: 1, active: true },
  { name: "architecture.md", type: "file", level: 1 },
  { name: "guides", type: "folder", level: 1 },
  { name: "setup.md", type: "file", level: 2 },
  { name: "notes", type: "folder", level: 0 },
  { name: "draft.md", type: "file", level: 1 },
  { name: "snippets", type: "folder", level: 0 },
  { name: "models.md", type: "file", level: 1 },
];

interface LocaleProps {
  locale?: Locale;
}

type WritingScene = {
  title: string;
  body: string;
  tab: string;
  files: string[];
  accent: string;
  bg: string;
  panel: string;
};

const writingScenes: Record<Locale, WritingScene[]> = {
  "pt-BR": [
    { title: "Arquitetura de sincronização", body: "O watcher observa a raiz do workspace e reconcilia abas abertas sem sobrescrever buffers sujos.", tab: "technical.md", files: ["docs", "technical.md", "watcher.md", "security.md", "release-notes.md"], accent: "#7dd3fc", bg: "#16191e", panel: "#1d2229" },
    { title: "Poema curto", body: "Entre a margem e o cursor, a frase encontra um lugar para respirar.", tab: "poema.md", files: ["poemas", "poema.md", "rascunhos.md", "haicais.md", "leituras.md"], accent: "#f4c68f", bg: "#2b231f", panel: "#3a2f29" },
    { title: "Notas de reunião", body: "Decisões: manter PR pequeno, validar janela única no Windows e revisar o fluxo de exportação.", tab: "notas.md", files: ["reunioes", "notas.md", "acoes.md", "decisoes.md", "follow-up.md"], accent: "#90f0a8", bg: "#17241b", panel: "#203124" },
    { title: "Cena de novela", body: "Ela fechou o caderno antes que a cidade descobrisse o nome escrito na última página.", tab: "capitulo.md", files: ["romance", "capitulo.md", "personagens.md", "cenas.md", "linha-tempo.md"], accent: "#8fb5ff", bg: "#111827", panel: "#0b1220" },
    { title: "Snippet de código", body: "const draft = workspace.open(file).then(syncPreview).catch(markExternalChange);", tab: "snippet.ts", files: ["snippets", "snippet.ts", "workspace.ts", "preview.ts", "tests.md"], accent: "#57ff9e", bg: "#040b04", panel: "#061207" },
  ],
  "en-US": [
    { title: "Sync architecture", body: "The watcher follows the workspace root and reconciles open tabs without overwriting dirty buffers.", tab: "technical.md", files: ["docs", "technical.md", "watcher.md", "security.md", "release-notes.md"], accent: "#7dd3fc", bg: "#16191e", panel: "#1d2229" },
    { title: "Short poem", body: "Between margin and cursor, the sentence finds a quiet place to breathe.", tab: "poem.md", files: ["poems", "poem.md", "drafts.md", "haiku.md", "reading.md"], accent: "#f4c68f", bg: "#2b231f", panel: "#3a2f29" },
    { title: "Meeting notes", body: "Decisions: keep PRs small, validate single-window behavior on Windows, review export flow.", tab: "notes.md", files: ["meetings", "notes.md", "actions.md", "decisions.md", "follow-up.md"], accent: "#90f0a8", bg: "#17241b", panel: "#203124" },
    { title: "Novel scene", body: "She closed the notebook before the city learned the name written on the final page.", tab: "chapter.md", files: ["novel", "chapter.md", "characters.md", "scenes.md", "timeline.md"], accent: "#8fb5ff", bg: "#111827", panel: "#0b1220" },
    { title: "Code snippet", body: "const draft = workspace.open(file).then(syncPreview).catch(markExternalChange);", tab: "snippet.ts", files: ["snippets", "snippet.ts", "workspace.ts", "preview.ts", "tests.md"], accent: "#57ff9e", bg: "#040b04", panel: "#061207" },
  ],
  "es-ES": [
    { title: "Arquitectura de sincronización", body: "El watcher observa la raíz del workspace y reconcilia pestañas abiertas sin sobrescribir buffers sucios.", tab: "technical.md", files: ["docs", "technical.md", "watcher.md", "security.md", "release-notes.md"], accent: "#7dd3fc", bg: "#16191e", panel: "#1d2229" },
    { title: "Poema breve", body: "Entre el margen y el cursor, la frase encuentra un lugar para respirar.", tab: "poema.md", files: ["poemas", "poema.md", "borradores.md", "haikus.md", "lecturas.md"], accent: "#f4c68f", bg: "#2b231f", panel: "#3a2f29" },
    { title: "Notas de reunión", body: "Decisiones: mantener PR pequeño, validar ventana única en Windows y revisar exportación.", tab: "notas.md", files: ["reuniones", "notas.md", "acciones.md", "decisiones.md", "seguimiento.md"], accent: "#90f0a8", bg: "#17241b", panel: "#203124" },
    { title: "Escena de novela", body: "Ella cerró el cuaderno antes de que la ciudad descubriera el nombre de la última página.", tab: "capitulo.md", files: ["novela", "capitulo.md", "personajes.md", "escenas.md", "linea-tiempo.md"], accent: "#8fb5ff", bg: "#111827", panel: "#0b1220" },
    { title: "Snippet de código", body: "const draft = workspace.open(file).then(syncPreview).catch(markExternalChange);", tab: "snippet.ts", files: ["snippets", "snippet.ts", "workspace.ts", "preview.ts", "tests.md"], accent: "#57ff9e", bg: "#040b04", panel: "#061207" },
  ],
};

type MarkLeeFile = {
  name: string;
  kind?: "file" | "folder";
  level?: number;
};

type EditorLine = {
  text: ReactNode;
  tone?: "heading" | "muted" | "accent" | "dim";
};

interface MarkLeeWindowProps {
  tabs: string[];
  files: MarkLeeFile[];
  activeTab?: string;
  activeFile?: string;
  title?: string;
  toolbar?: ReactNode;
  editor?: ReactNode;
  rightPane?: ReactNode;
  overlay?: ReactNode;
  status?: [string, string, string];
  accent?: string;
  bg?: string;
  panel?: string;
  className?: string;
}

const fileLabel = (item: MarkLeeFile) => {
  if (item.kind === "folder") return "[DIR]";
  const ext = item.name.split(".").pop()?.toUpperCase() ?? "MD";
  return `[${ext.slice(0, 3)}]`;
};

const renderEditorLines = (lines: EditorLine[]) => (
  <div className="marklee-editor-lines">
    {lines.map((line, index) => (
      <div key={index} className="marklee-editor-line">
        <span className="marklee-line-number">{index + 1}</span>
        <span className={`marklee-line-text ${line.tone ? `marklee-line-text--${line.tone}` : ""}`}>
          {line.text}
        </span>
      </div>
    ))}
  </div>
);

const MarkLeeWindow = ({
  tabs,
  files,
  activeTab = tabs[0],
  activeFile = activeTab,
  title = "Mark-Lee",
  toolbar,
  editor,
  rightPane,
  overlay,
  status = ["Markdown", "Ln 12, Col 18", "UTF-8"],
  accent,
  bg,
  panel,
  className = "",
}: MarkLeeWindowProps) => (
  <div
    className={`mockup-card marklee-window text-[11px] ${className}`}
    style={
      {
        "--hero-mockup-bg": bg,
        "--hero-mockup-panel": panel,
        "--hero-mockup-accent": accent,
      } as React.CSSProperties
    }
  >
    <div className="marklee-titlebar">
      <div className="marklee-window-controls">
        <span className="bg-destructive/65" />
        <span className="bg-primary/65" />
        <span className="bg-emerald-500/65" />
      </div>
      <span className="marklee-window-title">{title}</span>
      <div className="marklee-toolbar-icons" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
    {toolbar && <div className="marklee-toolbar">{toolbar}</div>}
    <div className="marklee-tabs">
      {tabs.map((tab) => (
        <div key={tab} className={`marklee-tab ${tab === activeTab ? "marklee-tab--active" : ""}`}>
          <span>{tab}</span>
          {tab === activeTab && <span className="marklee-tab-close">x</span>}
        </div>
      ))}
      <span className="marklee-tab-add">+</span>
    </div>
    <div className={`marklee-body ${rightPane ? "marklee-body--split" : ""}`}>
      <aside className="marklee-sidebar">
        <div className="marklee-sidebar-header">
          <span>Workspace</span>
          <span>{files.filter((item) => item.kind !== "folder").length}</span>
        </div>
        <div className="marklee-file-list">
          {files.map((item) => (
            <div
              key={`${item.name}-${item.level ?? 0}`}
              className={`marklee-file ${item.name === activeFile ? "marklee-file--active" : ""}`}
              style={{ paddingLeft: `${0.45 + (item.level ?? 0) * 0.62}rem` }}
            >
              <span>{fileLabel(item)}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </aside>
      <main className="marklee-editor">
        {editor}
        {overlay}
      </main>
      {rightPane && <aside className="marklee-preview">{rightPane}</aside>}
    </div>
    <div className="marklee-statusbar">
      {status.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  </div>
);

export const EditorMockup = ({ activeTab = 0, locale = "pt-BR", animated = false }: { activeTab?: number; animated?: boolean } & LocaleProps) => {
  const tabs = ["readme.md", "changelog.md", "notes.md"];
  const copy = mockupCopy[locale];
  const scenes = writingScenes[locale];
  const [sceneIndex, setSceneIndex] = useState(0);
  const [typedLength, setTypedLength] = useState(animated ? 0 : scenes[0].body.length);
  const scene = scenes[sceneIndex];
  const typedBody = scene.body.slice(0, typedLength);
  const visibleTabs = animated ? [scene.tab, ...scene.files.filter((file) => file !== scene.tab && file.includes(".")).slice(0, 2)] : tabs;
  const visibleTree = animated ? scene.files : sampleTree;

  useEffect(() => {
    if (!animated) return;
    const sceneText = scenes[sceneIndex].body;
    const done = typedLength >= sceneText.length;
    const delay = done ? 1500 : 28 + (typedLength % 8) * 7;
    const timer = window.setTimeout(() => {
      if (done) {
        setSceneIndex((current) => (current + 1) % scenes.length);
        setTypedLength(0);
      } else {
        setTypedLength((current) => current + 1);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [animated, sceneIndex, scenes, typedLength]);

  return (
    <MarkLeeWindow
      className={animated ? "hero-editor-mockup" : ""}
      tabs={visibleTabs}
      activeTab={visibleTabs[activeTab] ?? visibleTabs[0]}
      activeFile={animated ? scene.tab : "readme.md"}
      files={visibleTree.map((item) => ({
        name: item.replace(/^(\s*\[(DIR|MD)\]\s*)/, "").trim(),
        kind: item.includes(".") ? "file" : "folder",
        level: item.startsWith("  ") ? 1 : 0,
      }))}
      accent={animated ? scene.accent : undefined}
      bg={animated ? scene.bg : undefined}
      panel={animated ? scene.panel : undefined}
      status={[copy.statusMarkdown, copy.statusCursor, "UTF-8"]}
      editor={renderEditorLines([
        { text: <># {animated ? scene.title : "Mark-Lee"}</>, tone: "heading" },
        {
          text: (
            <>
              {animated ? typedBody : "Escrita focada com preview integrado."}
              {animated && <span className="hero-editor-caret" />}
            </>
          ),
        },
        { text: animated ? "" : "Fluxo de publicação previsível." },
        { text: "" },
        { text: "## Recursos", tone: "accent" },
        { text: "- Modo zen" },
        { text: "- Presets de preview" },
        { text: "- Snippets reutilizáveis" },
      ])}
    />
  );
};

export const SplitViewMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <MarkLeeWindow
      tabs={["readme.md", "preview.md"]}
      activeTab="readme.md"
      activeFile="readme.md"
      files={[
        { name: "docs", kind: "folder" },
        { name: "readme.md", level: 1 },
        { name: "guia-rapido.md", level: 1 },
        { name: "publicacao.md", level: 1 },
      ]}
      toolbar={
        <div className="marklee-segmented">
          {copy.splitModes.map((mode, i) => (
            <span key={mode} className={i === 1 ? "is-active" : ""}>
              {mode}
            </span>
          ))}
        </div>
      }
      editor={renderEditorLines([
        { text: `## ${copy.splitTitle}`, tone: "accent" },
        { text: copy.splitDescriptionA },
        { text: copy.splitDescriptionB },
      ])}
      rightPane={
        <div className="marklee-rendered-preview">
          <h4>{copy.splitTitle}</h4>
          <p>
            {copy.splitDescriptionA} {copy.splitDescriptionB}
          </p>
        </div>
      }
      status={[copy.statusMarkdown, copy.statusCursor, "UTF-8"]}
    />
  );
};

export const ExportMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];
  const formats = [
    { label: "Markdown", ext: ".md", active: true },
    { label: "HTML", ext: ".html", active: false },
    { label: "PDF", ext: ".pdf", active: false },
  ];

  return (
    <MarkLeeWindow
      tabs={["release-notes.md", "preview.html"]}
      activeTab="release-notes.md"
      activeFile="release-notes.md"
      files={[
        { name: "publicacao", kind: "folder" },
        { name: "release-notes.md", level: 1 },
        { name: "changelog.md", level: 1 },
        { name: "dist", kind: "folder" },
        { name: "preview.html", level: 1 },
      ]}
      editor={renderEditorLines([
        { text: "# Release notes", tone: "heading" },
        { text: "Versao preparada para publicacao." },
        { text: "Exportacao configurada com preset formatado." },
      ])}
      overlay={
        <div className="marklee-modal">
          <div className="marklee-modal-title">{copy.exportTitle}</div>
          <div className="marklee-modal-options">
            {formats.map((format) => (
              <div key={format.label} className={`marklee-modal-option ${format.active ? "is-active" : ""}`}>
                <span>{format.label}</span>
                <span>{format.ext}</span>
              </div>
            ))}
          </div>
          <div className="marklee-modal-actions">
            <span>{copy.exportButton}</span>
            <span>{copy.cancelButton}</span>
          </div>
        </div>
      }
      status={["Markdown", "Export preset", "UTF-8"]}
    />
  );
};

export const FileTreeMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card text-[11px]">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <span className="text-[11px] font-semibold text-foreground">{copy.workspaceTitle}</span>
        <span className="text-[10px] text-muted-foreground/50">{copy.filesLabel}</span>
      </div>
      <div className="grid min-h-[180px] grid-cols-[180px_1fr]">
        <div className="border-r border-border/30 p-2">
          {workspaceItems.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className={`flex items-center gap-2 rounded px-2 py-1.5 ${item.active ? "bg-primary/10 text-primary" : "text-muted-foreground/70 hover:bg-secondary/50"
                }`}
              style={{ paddingLeft: `${8 + item.level * 12}px` }}
            >
              <span className="text-[10px]">{item.type === "folder" ? "[DIR]" : "[MD]"}</span>
              <span className={`text-[11px] ${item.active ? "font-medium" : ""}`}>{item.name}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 p-3">
          <div className="rounded border border-border/30 bg-secondary/30 px-2 py-1 text-[10px] text-muted-foreground/70">
            Editor · readme.md
          </div>
          <div className="rounded border border-border/30 bg-secondary/30 px-2 py-1 text-[10px] text-muted-foreground/70">
            Preview · preset: Documentation
          </div>
          <div className="rounded border border-border/30 bg-secondary/30 px-2 py-1 text-[10px] text-muted-foreground/70">
            Export queue · 2 itens
          </div>
        </div>
      </div>
    </div>
  );
};

export const ThemePreviewMockup = ({
  colors,
  name,
  locale = "pt-BR",
}: {
  colors: string[];
  name: string;
} & LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card overflow-hidden text-[11px]">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2" style={{ backgroundColor: colors[0] }}>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: `${colors[2]}60` }} />
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: `${colors[3]}60` }} />
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: `${colors[4]}60` }} />
        </div>
        <span className="ml-1 text-[10px]" style={{ color: colors[3] }}>
          {name}
        </span>
      </div>
      <div className="min-h-[160px] space-y-1.5 p-3 font-mono" style={{ backgroundColor: colors[0] }}>
        <div style={{ color: colors[2] }} className="text-xs font-semibold">
          {copy.previewTitle}
        </div>
        <div style={{ color: colors[3] }} className="text-[10px] opacity-80">
          {copy.previewDescription}
        </div>
        <div className="h-1" />
        <div style={{ color: colors[2] }} className="text-[11px] font-semibold">
          # Mark-Lee
        </div>
        <div style={{ color: colors[4] }} className="text-[10px]">
          - Zen mode
        </div>
        <div style={{ color: colors[4] }} className="text-[10px]">
          - Presets
        </div>
        <div style={{ color: colors[4] }} className="text-[10px]">
          - Snippets
        </div>
      </div>
    </div>
  );
};

export const ThemeCycleHeroMockup = ({
  themes,
}: {
  themes: Array<{ name: string; colors: string[] }>;
}) => {
  const [activeTheme, setActiveTheme] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", updatePreference);
      return () => query.removeEventListener("change", updatePreference);
    }

    query.addListener(updatePreference);
    return () => query.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    if (themes.length < 2 || reducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveTheme((current) => (current + 1) % themes.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [themes.length, reducedMotion]);

  const theme = themes[activeTheme] ?? themes[0];
  const gradient = useMemo(() => {
    if (!theme) return "linear-gradient(140deg, #131313, #1f1f1f)";
    return `linear-gradient(140deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]}55)`;
  }, [theme]);
  const palette = theme?.colors ?? ["#131313", "#222222", "#ffffff", "#f4b942", "#4f46e5"];

  return (
    <motion.div
      animate={{ background: gradient }}
      transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeInOut" }}
      className="hero-theme-cycle-mockup rounded-lg p-3"
    >
      <MarkLeeWindow
        className="hero-editor-mockup"
        tabs={["themes.md", "preview.md", "export.md"]}
        activeTab="themes.md"
        activeFile="themes.md"
        files={[
          { name: "docs", kind: "folder" },
          { name: "readme.md", level: 1 },
          { name: "themes.md", level: 1 },
          { name: "export.md", level: 1 },
          { name: "snippets", kind: "folder" },
        ]}
        accent={palette[3]}
        bg={palette[0]}
        panel={palette[1]}
        editor={renderEditorLines([
          { text: `# ${theme?.name ?? "Theme"}`, tone: "heading" },
          { text: "A interface muda de tom, mas a leitura continua estável." },
          { text: "" },
          {
            text: (
              <span
                className="marklee-theme-strip"
                style={{ background: `linear-gradient(90deg, ${palette.join(", ")})` }}
              />
            ),
          },
          { text: "Shell | Editor | Preview | Export", tone: "muted" },
        ])}
        status={[theme?.name ?? "Theme", "Theme preview", "UTF-8"]}
      />
    </motion.div>
  );
};

export const FocusModeMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <MarkLeeWindow
      className="marklee-window--zen"
      tabs={["poema.md"]}
      activeTab="poema.md"
      activeFile="poema.md"
      files={[
        { name: "poemas", kind: "folder" },
        { name: "poema.md", level: 1 },
      ]}
      editor={
        <div className="marklee-zen-page">
          <p>{copy.focusTitle}</p>
          <blockquote>"Texto no centro da tela."</blockquote>
          <span>{copy.focusSubtitle}</span>
        </div>
      }
      status={[copy.focusTitle, "Zen", "UTF-8"]}
    />
  );
};

export const PreviewPresetMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <MarkLeeWindow
      tabs={["preview.md", "preset-crud.md"]}
      activeTab="preset-crud.md"
      activeFile="preset-crud.md"
      files={[
        { name: "presets", kind: "folder" },
        { name: "technical.md", level: 1 },
        { name: "article.md", level: 1 },
        { name: "preset-crud.md", level: 1 },
      ]}
      editor={renderEditorLines([
        { text: `# ${copy.previewTitle}`, tone: "heading" },
        { text: copy.previewDescription },
        { text: "- Technical" },
        { text: "- Article" },
        { text: "- Release" },
      ])}
      rightPane={
        <div className="marklee-rendered-preview">
          <h4>CRUD</h4>
          <p>{copy.previewDescription}</p>
          <div className="marklee-preview-pills">
            <span>Technical</span>
            <span>Article</span>
            <span>Release</span>
          </div>
        </div>
      }
      status={[copy.previewTitle, "Preset: CRUD", "UTF-8"]}
    />
  );
};

export const WorkspaceContextMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <MarkLeeWindow
      tabs={["readme.md", "architecture.md", "draft.md"]}
      activeTab="readme.md"
      activeFile="readme.md"
      files={workspaceItems.map((item) => ({
        name: item.name,
        kind: item.type,
        level: item.level,
      }))}
      editor={renderEditorLines([
        { text: `# ${copy.workspaceTitle}`, tone: "heading" },
        { text: copy.filesLabel },
        { text: "Tab: readme.md" },
        { text: "Preview: documentation preset" },
        { text: "Export queue: 1 pending", tone: "muted" },
      ])}
      status={[copy.workspaceTitle, copy.filesLabel, "UTF-8"]}
    />
  );
};

export const SnippetModelsMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];
  const items = ["Architecture ADR", "Release note", "Daily log", "Bug report"];

  return (
    <MarkLeeWindow
      tabs={["modelos.md", "release-note.md"]}
      activeTab="modelos.md"
      activeFile="modelos.md"
      files={[
        { name: "snippets", kind: "folder" },
        { name: "modelos.md", level: 1 },
        { name: "release-note.md", level: 1 },
        { name: "daily-log.md", level: 1 },
        { name: "bug-report.md", level: 1 },
      ]}
      editor={renderEditorLines([
        { text: `# ${copy.snippetsTitle}`, tone: "heading" },
        { text: copy.snippetsStatus },
        ...items.map((item) => ({ text: `- ${item}` })),
      ])}
      overlay={
        <div className="marklee-floating-palette marklee-floating-palette--small">
          <strong>{copy.snippetsCreate}</strong>
          <span>Architecture ADR</span>
          <span>Release note</span>
        </div>
      }
      status={[copy.snippetsTitle, copy.snippetsStatus, "UTF-8"]}
    />
  );
};

export const CommandPaletteMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];
  const actions = [
    { label: "Export document", hint: "Ctrl+E", active: true },
    { label: "Open workspace", hint: "Ctrl+Shift+O" },
    { label: ">snip:release_note", hint: "Snippet" },
    { label: "drafts/roadmap.md", hint: "Arquivo" },
  ];

  return (
    <MarkLeeWindow
      tabs={["roadmap.md", "drafts.md"]}
      activeTab="roadmap.md"
      activeFile="roadmap.md"
      files={[
        { name: "drafts", kind: "folder" },
        { name: "roadmap.md", level: 1 },
        { name: "release.md", level: 1 },
        { name: "atalhos.md", level: 1 },
      ]}
      editor={renderEditorLines([
        { text: "# Roadmap", tone: "heading" },
        { text: "A paleta fica sobre a edicao sem deslocar abas ou workspace." },
      ])}
      overlay={
        <div className="marklee-floating-palette">
          <div className="marklee-palette-input">{copy.commandHint}</div>
          <p>{copy.commandTitle}</p>
          {actions.map((action) => (
            <div key={action.label} className={`marklee-palette-row ${action.active ? "is-active" : ""}`}>
              <span>{action.label}</span>
              <span>{action.hint}</span>
            </div>
          ))}
        </div>
      }
      status={[copy.commandTitle, "Ctrl+Shift+P", "UTF-8"]}
    />
  );
};

export const EngineeringHeroMockup = () => {
  const codeLines = [
    "watch_workspace(path).await?",
    "emit('workspace-fs-change', payload)",
    "sanitize_markdown(document)",
    "export_html(activePreset)",
  ];

  return (
    <MarkLeeWindow
      className="hero-editor-mockup"
      tabs={["watcher.rs", "security.rs", "PLAN.md"]}
      activeTab="watcher.rs"
      activeFile="watcher.rs"
      files={[
        { name: "src-tauri", kind: "folder" },
        { name: "watcher.rs", level: 1 },
        { name: "security.rs", level: 1 },
        { name: "src", kind: "folder" },
        { name: "SettingsPanel.tsx", level: 1 },
      ]}
      accent="#7dd3fc"
      bg="#101820"
      panel="#16232a"
      editor={renderEditorLines([
        { text: "# Fluxo de arquivo externo", tone: "heading" },
        { text: "1. Receber intenção de abertura." },
        { text: "2. Preservar workspace explícito." },
        { text: "3. Atualizar sidebar por watcher." },
        { text: "Sem sobrescrever buffer sujo.", tone: "muted" },
      ])}
      rightPane={
        <div className="marklee-code-card">
          <p>Core path</p>
          {codeLines.map((line) => (
            <code key={line}>{line}</code>
          ))}
          <span>CI: build, site smoke, rust check</span>
        </div>
      }
      status={["Rust", "Tauri + React", "CI"]}
    />
  );
};

export const ContributionWritingMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];
  const suggestions = {
    "pt-BR": [
      "Sugestão: explicar melhor o modo janela única.",
      "Sugestão: reduzir bordas no painel de temas.",
      "Sugestão: validar watcher com arquivo renomeado.",
    ],
    "en-US": [
      "Suggestion: clarify single-window behavior.",
      "Suggestion: reduce borders in the themes panel.",
      "Suggestion: validate watcher after file rename.",
    ],
    "es-ES": [
      "Sugerencia: aclarar la ventana única.",
      "Sugerencia: reducir bordes en temas.",
      "Sugerencia: validar watcher al renombrar archivo.",
    ],
  }[locale];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % suggestions.length), 2600);
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  return (
    <MarkLeeWindow
      className="hero-editor-mockup"
      tabs={["feedback.md", "pull-request.md", "ci.md"]}
      activeTab="feedback.md"
      activeFile="feedback.md"
      files={[
        { name: "issues", kind: "folder" },
        { name: "feedback.md", level: 1 },
        { name: "design.md", level: 1 },
        { name: "tests", kind: "folder" },
        { name: "ci-checks.md", level: 1 },
      ]}
      accent="#f2b84b"
      bg="#101820"
      panel="#16232a"
      editor={renderEditorLines([
        { text: "# Revisão de contribuição", tone: "heading" },
        { text: suggestions[active] },
        { text: "Validar localmente antes do PR.", tone: "muted" },
      ])}
      overlay={
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="marklee-modal marklee-modal--suggestion"
        >
          <div className="marklee-modal-title">Sugestão recebida</div>
          <p>{suggestions[active]}</p>
          <div className="marklee-modal-actions">
            <span>Aplicar</span>
            <span>Reescrever</span>
          </div>
        </motion.div>
      }
      status={[copy.explorer, "Review", "UTF-8"]}
    />
  );
};

export const ZenPoemMockup = ({ lines, credit }: { lines: string[]; credit: string }) => (
  <MarkLeeWindow
    className="hero-editor-mockup marklee-window--zen"
    tabs={["faq.md", "poema.md"]}
    activeTab="poema.md"
    activeFile="poema.md"
    files={[
      { name: "ajuda", kind: "folder" },
      { name: "faq.md", level: 1 },
      { name: "poema.md", level: 1 },
    ]}
    accent="#f2c078"
    bg="#16130f"
    panel="#201a13"
    editor={
      <div className="marklee-zen-page">
        {lines.map((line) => (
          <blockquote key={line}>{line}</blockquote>
        ))}
        <span>{credit}</span>
      </div>
    }
    overlay={
      <motion.div
        className="marklee-modal marklee-modal--faq pointer-events-none"
        animate={{ opacity: [1, 1, 0], y: [0, 0, 10] }}
        transition={{ duration: 4.8, times: [0, 0.62, 1], repeat: Infinity, repeatDelay: 1.2 }}
      >
        <div className="marklee-modal-title">FAQ</div>
        <p>Consulta aberta. Entrando em modo zen para leitura.</p>
      </motion.div>
    }
    status={["Zen", "FAQ", "UTF-8"]}
  />
);
