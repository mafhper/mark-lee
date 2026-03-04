import { useEffect, useMemo, useState } from "react";
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

export const EditorMockup = ({ activeTab = 0, locale = "pt-BR" }: { activeTab?: number } & LocaleProps) => {
  const tabs = ["readme.md", "changelog.md", "notes.md"];
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card text-[11px]">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
        </div>
        <span className="ml-2 text-[10px] text-muted-foreground/60">Mark-Lee</span>
      </div>

      <div className="flex border-b border-border/40">
        {tabs.map((tab, i) => (
          <div
            key={tab}
            className={`border-r border-border/30 px-3 py-1.5 text-[10px] ${
              i === activeTab ? "bg-secondary/80 font-medium text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="flex min-h-[210px]">
        <div className="w-[132px] shrink-0 space-y-1 border-r border-border/30 p-2">
          <div className="mb-2 px-1 text-[9px] uppercase tracking-wider text-muted-foreground/40">
            {copy.explorer}
          </div>
          {sampleTree.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className={`truncate rounded px-1.5 py-0.5 text-[10px] ${
                i === 1 ? "bg-primary/15 text-primary" : "text-muted-foreground/60"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-1.5 p-3 font-mono">
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">1</span>
            <span className="font-semibold text-primary"># Mark-Lee</span>
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">2</span>
            <span className="text-muted-foreground/80">Escrita focada com preview integrado.</span>
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">3</span>
            <span className="text-muted-foreground/80">Fluxo de publicação previsível.</span>
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">4</span>
            <span className="text-muted-foreground/40" />
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">5</span>
            <span className="font-semibold text-primary/80">## Recursos</span>
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">6</span>
            <span className="text-muted-foreground/80">- Modo zen</span>
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">7</span>
            <span className="text-muted-foreground/80">- Presets de preview</span>
          </div>
          <div className="flex gap-2">
            <span className="w-4 text-right text-[9px] text-muted-foreground/30">8</span>
            <span className="text-muted-foreground/80">- Snippets reutilizáveis</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 px-3 py-1 text-[9px] text-muted-foreground/40">
        <span>{copy.statusMarkdown}</span>
        <span>{copy.statusCursor}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
};

export const SplitViewMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card text-[11px]">
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
        </div>
        <div className="ml-2 flex gap-0">
          {copy.splitModes.map((mode, i) => (
            <span
              key={mode}
              className={`rounded px-2 py-0.5 text-[9px] ${
                i === 1 ? "bg-primary/20 text-primary" : "text-muted-foreground/50"
              }`}
            >
              {mode}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-[180px]">
        <div className="flex-1 space-y-1 border-r border-border/30 p-3 font-mono">
          <div className="font-semibold text-primary/80">## {copy.splitTitle}</div>
          <div className="text-muted-foreground/70">{copy.splitDescriptionA}</div>
          <div className="text-muted-foreground/70">{copy.splitDescriptionB}</div>
          <div className="mt-1 text-green-400/60">npm run site:dev</div>
        </div>

        <div className="flex-1 space-y-2 p-3">
          <div className="text-sm font-bold text-foreground/90">{copy.splitTitle}</div>
          <div className="text-[10px] leading-relaxed text-muted-foreground/70">
            {copy.splitDescriptionA} {copy.splitDescriptionB}
          </div>
          <div className="rounded bg-secondary/80 px-2 py-1.5 font-mono text-[10px] text-green-400/70">
            npm run site:test:smoke
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 px-3 py-1 text-[9px] text-muted-foreground/40">
        <span>Split View</span>
        <span>readme.md</span>
      </div>
    </div>
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
    <div className="mockup-card text-[11px]">
      <div className="border-b border-border/40 px-4 py-3">
        <span className="text-[11px] font-semibold text-foreground">{copy.exportTitle}</span>
      </div>
      <div className="space-y-3 p-4">
        {formats.map((format) => (
          <div
            key={format.label}
            className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${
              format.active ? "border-primary/40 bg-primary/5" : "border-border/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full border-2 ${
                  format.active ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}
              >
                {format.active && <div className="m-auto mt-[2px] h-1 w-1 rounded-full bg-primary-foreground" />}
              </div>
              <span className={format.active ? "font-medium text-foreground" : "text-muted-foreground"}>
                {format.label}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground/50">{format.ext}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <div className="flex-1 rounded-md bg-primary py-2 text-center text-[10px] font-medium text-primary-foreground">
            {copy.exportButton}
          </div>
          <div className="rounded-md border border-border/40 px-4 py-2 text-center text-[10px] text-muted-foreground">
            {copy.cancelButton}
          </div>
        </div>
      </div>
    </div>
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
              className={`flex items-center gap-2 rounded px-2 py-1.5 ${
                item.active ? "bg-primary/10 text-primary" : "text-muted-foreground/70 hover:bg-secondary/50"
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
    return `linear-gradient(140deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]}33)`;
  }, [theme]);

  return (
    <div className="mockup-card overflow-hidden">
      <motion.div
        animate={{ background: gradient }}
        transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeInOut" }}
        className="p-4"
      >
        <div className="rounded-lg border border-black/20 bg-black/20 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[10px] text-white/80">
            <span>Mark-Lee UI</span>
            <span>{theme?.name ?? "Theme"}</span>
          </div>
          <div className="mt-3 grid grid-cols-[120px_1fr] gap-3">
            <div className="space-y-2 rounded border border-white/15 bg-black/30 p-2">
              <div className="h-2 w-20 rounded bg-white/30" />
              <div className="h-2 w-16 rounded bg-white/20" />
              <div className="h-2 w-24 rounded bg-white/20" />
              <div className="h-2 w-14 rounded bg-white/20" />
            </div>
            <div className="space-y-2 rounded border border-white/15 bg-black/30 p-2">
              <div className="h-2 w-full rounded bg-white/30" />
              <div className="h-2 w-10/12 rounded bg-white/20" />
              <div className="h-2 w-8/12 rounded bg-white/20" />
              <div className="mt-3 h-14 rounded border border-white/15 bg-black/20" />
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {(theme?.colors ?? []).slice(0, 5).map((color) => (
              <span key={color} className="h-2.5 w-6 rounded" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const FocusModeMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card flex min-h-[240px] items-center justify-center p-8 text-center">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">{copy.focusTitle}</p>
        <div className="mx-auto mt-6 max-w-[260px] space-y-2 font-mono text-sm text-foreground/90">
          <p>"Texto no centro da tela."</p>
          <p className="text-muted-foreground/70">Sem painéis laterais visíveis.</p>
        </div>
        <p className="mt-8 text-[10px] text-muted-foreground/55">{copy.focusSubtitle}</p>
      </div>
    </div>
  );
};

export const PreviewPresetMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card min-h-[240px] p-4 text-[11px]">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-semibold text-foreground">{copy.previewTitle}</span>
        <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] text-primary">CRUD</span>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/70">{copy.previewDescription}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded border border-primary/30 bg-primary/10 p-2 text-[10px] text-primary">Technical</div>
        <div className="rounded border border-border/40 bg-secondary/50 p-2 text-[10px] text-muted-foreground">Article</div>
        <div className="rounded border border-border/40 bg-secondary/50 p-2 text-[10px] text-muted-foreground">Release</div>
      </div>
      <div className="mt-4 rounded-lg border border-border/40 bg-secondary/30 p-3">
        <div className="h-2 w-2/3 rounded bg-muted" />
        <div className="mt-2 h-2 w-full rounded bg-muted" />
        <div className="mt-2 h-2 w-4/5 rounded bg-muted" />
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded bg-primary px-2.5 py-1 text-[10px] text-primary-foreground">
            Save
          </button>
          <button type="button" className="rounded border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
};

export const WorkspaceContextMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];

  return (
    <div className="mockup-card min-h-[240px] text-[11px]">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="font-semibold text-foreground">{copy.workspaceTitle}</span>
        <span className="text-[10px] text-muted-foreground/60">{copy.filesLabel}</span>
      </div>
      <div className="grid grid-cols-[180px_1fr]">
        <div className="min-h-[200px] border-r border-border/30 p-2">
          {workspaceItems.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className={`rounded px-2 py-1.5 text-[10px] ${item.active ? "bg-primary/10 text-primary" : "text-muted-foreground/70"}`}
              style={{ paddingLeft: `${8 + item.level * 12}px` }}
            >
              {item.type === "folder" ? "▾ " : "• "}
              {item.name}
            </div>
          ))}
        </div>
        <div className="min-h-[200px] space-y-2 p-3">
          <div className="rounded border border-border/30 bg-secondary/30 p-2 text-[10px] text-muted-foreground/80">
            Tab: readme.md
          </div>
          <div className="rounded border border-border/30 bg-secondary/30 p-2 text-[10px] text-muted-foreground/80">
            Preview: documentation preset
          </div>
          <div className="rounded border border-border/30 bg-secondary/30 p-2 text-[10px] text-muted-foreground/80">
            Export queue: 1 pending
          </div>
        </div>
      </div>
    </div>
  );
};

export const SnippetModelsMockup = ({ locale = "pt-BR" }: LocaleProps) => {
  const copy = mockupCopy[locale];
  const items = ["Architecture ADR", "Release note", "Daily log", "Bug report"];

  return (
    <div className="mockup-card min-h-[240px] p-4 text-[11px]">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-semibold text-foreground">{copy.snippetsTitle}</span>
        <button type="button" className="rounded bg-primary px-2.5 py-1 text-[10px] text-primary-foreground">
          {copy.snippetsCreate}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/70">{copy.snippetsStatus}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded border border-border/35 bg-secondary/40 px-2.5 py-2 text-[10px] text-muted-foreground/85">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export const EngineeringHeroMockup = () => {
  const codeLines = [
    "const result = await invoke('export_markdown', payload)",
    "if (result.ok) setStatus('published')",
    "const nodes = parseMarkdown(document)",
    "renderPreview(nodes, { preset: activePreset })",
  ];

  return (
    <div className="mockup-card relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-500/10" />
      <div className="relative grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-border/40 bg-card/80 p-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground/50">Interface</div>
          <div className="space-y-2">
            <div className="h-2 w-10/12 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
            <div className="h-2 w-8/12 rounded bg-muted" />
            <div className="mt-3 h-14 rounded border border-border/40 bg-secondary/60" />
          </div>
        </div>
        <div className="rounded-lg border border-primary/20 bg-background/75 p-3 font-mono text-[10px] text-primary/85">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-primary/60">Core code</div>
          <div className="space-y-1.5">
            {codeLines.map((line) => (
              <p key={line} className="truncate">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ZenPoemMockup = ({ lines, credit }: { lines: string[]; credit: string }) => (
  <div className="mockup-card flex min-h-[240px] items-center justify-center p-8">
    <div className="max-w-xs text-center font-serif text-sm leading-relaxed text-foreground/90">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="mt-6 text-[10px] font-sans uppercase tracking-[0.16em] text-muted-foreground/60">{credit}</p>
    </div>
  </div>
);
