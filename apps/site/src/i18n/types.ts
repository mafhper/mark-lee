export const LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

export type Locale = (typeof LOCALES)[number];

export type PageKey =
  | "home"
  | "gallery"
  | "engineering"
  | "contributing"
  | "faq"
  | "downloads";

export type DownloadPlatform = "windows" | "macos" | "linux";
export type StageView = "editor" | "memories";
export type HomeSectionId = "leituras" | "arquivo" | "temas";

export const HOME_SECTION_IDS: readonly HomeSectionId[] = ["leituras", "arquivo", "temas"];

export const PRIMARY_HOME_SECTIONS = ["leituras", "arquivo", "temas"] as const;

export const DEFAULT_LOCALE: Locale = "pt-BR";

export const REPO_URL = "https://github.com/mafhper/mark-lee";
export const RELEASES_URL = `${REPO_URL}/releases`;

export const ROUTE_SEGMENTS: Record<Locale, Record<PageKey, string>> = {
  "pt-BR": {
    home: "",
    gallery: "galeria",
    engineering: "engenharia",
    contributing: "contribuir",
    faq: "faq",
    downloads: "downloads",
  },
  "en-US": {
    home: "",
    gallery: "gallery",
    engineering: "engineering",
    contributing: "contributing",
    faq: "faq",
    downloads: "downloads",
  },
  "es-ES": {
    home: "",
    gallery: "galeria",
    engineering: "ingenieria",
    contributing: "contribuir",
    faq: "faq",
    downloads: "downloads",
  },
};

export const NAV_PAGE_ORDER: Array<Exclude<PageKey, "downloads">> = [
  "home",
  "gallery",
  "engineering",
  "contributing",
  "faq",
];

export interface FooterLink {
  label: string;
  page?: PageKey;
  section?: HomeSectionId;
  href?: string;
  external?: boolean;
}

export interface FooterGroup {
  title: string;
  links: FooterLink[];
}

export interface CtaCopy {
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface HomeCopy {
  hero: {
    label: string;
    titleLines: string[];
    accentLine: number;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    facts: Array<[string, string]>;
  };
  stage: {
    index: string;
    label: string;
    title: string;
    intro: string;
    views: Array<{ id: StageView; name: string; caption: string }>;
    chrome: {
      menus: string[];
      workspace: string;
      search: string;
      saved: string;
      /** O selo da barra de status quando a entrada aberta e um rascunho. */
      draft: string;
      properties: { record: string; schema: string; tags: string; file: string };
      /** A lateral de Memorias: acordeoes do caderno aberto. */
      nav: {
        newEntry: string;
        /** "Cadernos" — o acordeao do cartao de capa. */
        journal: string;
        sections: {
          entries: string;
          today: string;
          favorites: string;
          tags: string;
          tasks: string;
          pins: string;
        };
      };
      /** O seletor de vistas do painel do meio. */
      views: {
        list: string;
        calendar: string;
        gallery: string;
        places: string;
      };
      /** O placeholder do campo de busca da lista de registros. */
      listSearch: string;
      tasks: {
        pending: string;
        inProgress: string;
        completed: string;
        cancelled: string;
        empty: string;
      };
      pins: {
        day: string;
        week: string;
        month: string;
        all: string;
        /** "Pins" como sufixo do chip de contagem ("3 Pins"). */
        count: string;
      };
      /** O botao que abre as linhas escondidas de tags. */
      more: string;
      /** O sufixo da contagem de fotos ("1 foto"). */
      photos: string;
      /** A faixa de acoes do topo, que muda com a leitura. */
      actions: {
        formatting: string;
        newEntry: string;
        calendar: string;
        gallery: string;
        places: string;
      };
      metadata: string;
      words: string;
    };
  };
  files: {
    index: string;
    label: string;
    title: string;
    text: string;
    caveat: string;
    folderLabel: string;
    note: string;
  };
  tools: {
    label: string;
    title: string;
    rows: Array<{ n: string; name: string; text: string }>;
  };
  themes: {
    index: string;
    label: string;
    title: string;
    text: string;
    note: string;
    sampleLabel: string;
  };
  code: {
    index: string;
    label: string;
    title: string;
    text: string;
    stack: Array<[string, string]>;
    cta: string;
  };
  download: {
    label: string;
    cta: string;
    formats: Record<DownloadPlatform, string>;
    license: string;
    source: string;
  };
}

export interface ProductVisual {
  source: string;
  width: number;
  height: number;
  alt: Record<Locale, string>;
  focalPoint: string;
  capturedAt: string;
  appVersion: string;
}

export interface PageMeta {
  title: string;
  description: string;
}

export type GalleryPreviewVisual = "preview" | "focus" | "workspace" | "export";

export interface GalleryCopy {
  hero: {
    label: string;
    title: string;
    description: string;
  };
  themesSection: {
    label: string;
    title: string;
    description: string;
    items: Array<{
      name: string;
      description: string;
      colors: string[];
    }>;
  };
  previewSection: {
    label: string;
    title: string;
    description: string;
    items: Array<{
      label: string;
      title: string;
      description: string;
      visual: GalleryPreviewVisual;
    }>;
  };
  ctaSection: CtaCopy;
}

export interface EngineeringCopy {
  hero: {
    label: string;
    title: string;
    description: string;
  };
  architectureSection: {
    label: string;
    title: string;
    description: string;
    flowTitle: string;
    flowLabels: {
      ui: string;
      preview: string;
      bridge: string;
      core: string;
      filesystem: string;
      flow: string;
    };
    layers: Array<{
      name: string;
      description: string;
      colorClass: string;
    }>;
  };
  stackSection: {
    label: string;
    title: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
      tags: string[];
    }>;
  };
  recentCommitsSection: {
    label: string;
    title: string;
    description: string;
    emptyMessage: string;
    viewAllLabel: string;
  };
  ctaSection: CtaCopy;
}

export interface ContributingCopy {
  hero: {
    label: string;
    title: string;
    description: string;
    flowTitle: string;
    flowSteps: string[];
    testsLabel: string;
    buildLabel: string;
  };
  stepsSection: {
    label: string;
    title: string;
    githubCta: string;
    items: Array<{
      step: string;
      title: string;
      description: string;
    }>;
  };
  guideSection: {
    label: string;
    title: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  };
  qualitySection: {
    label: string;
    title: string;
    description: string;
    principles: Array<{
      title: string;
      description: string;
    }>;
    scriptsTitle: string;
    scripts: Array<{
      command: string;
      description: string;
    }>;
  };
}

export interface FaqCopy {
  hero: {
    label: string;
    title: string;
    description: string;
  };
  poemSnippet: {
    lines: string[];
    credit: string;
  };
  sections: Array<{
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  }>;
}

export interface DownloadsCopy {
  hero: {
    label: string;
    title: string;
    description: string;
  };
  section: {
    title: string;
    buttonLabel: string;
    fallbackLabel: string;
    items: Array<{
      platform: DownloadPlatform;
      name: string;
      status: string;
    }>;
  };
}

export interface SiteCopy {
  languageName: string;
  languageSwitcherLabel: string;
  nav: Record<Exclude<PageKey, "downloads">, string> & {
    editor: string;
    memories: string;
    localFirst: string;
    product: string;
    files: string;
    customization: string;
    primaryAriaLabel: string;
    mobileAriaLabel: string;
  };
  downloadLabel: string;
  githubLabel: string;
  openMenuAria: string;
  closeMenuAria: string;
  footer: {
    description: string;
    copyright: string;
    groups: FooterGroup[];
  };
  notFound: {
    title: string;
    description: string;
    cta: string;
  };
  redirecting: string;
  pages: {
    home: HomeCopy;
    gallery: GalleryCopy;
    engineering: EngineeringCopy;
    contributing: ContributingCopy;
    faq: FaqCopy;
    downloads: DownloadsCopy;
  };
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function languageTagToLocale(languageTag: string): Locale | null {
  const normalized = languageTag.toLowerCase();
  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("en")) return "en-US";
  if (normalized.startsWith("es")) return "es-ES";
  return null;
}

export function detectPreferredLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (isLocale(language)) return language;
    const mapped = languageTagToLocale(language);
    if (mapped) return mapped;
  }
  return DEFAULT_LOCALE;
}

export function pathFor(locale: Locale, page: PageKey): string {
  const segment = ROUTE_SEGMENTS[locale][page];
  if (!segment) {
    return `/${locale}`;
  }
  return `/${locale}/${segment}`;
}

export function homeSectionPath(locale: Locale, section: HomeSectionId): string {
  return `${pathFor(locale, "home")}#${section}`;
}

export function localeFromPathname(pathname: string): Locale | null {
  const [first] = pathname.split("/").filter(Boolean);
  if (!first || !isLocale(first)) return null;
  return first;
}

export function pageFromPathname(pathname: string): PageKey | null {
  const locale = localeFromPathname(pathname);
  if (!locale) return null;

  const [, second] = pathname.split("/").filter(Boolean);
  const slug = second ?? "";

  const match = (Object.entries(ROUTE_SEGMENTS[locale]) as Array<[PageKey, string]>).find(
    ([, value]) => value === slug
  );

  return match?.[0] ?? null;
}

export function localizedPathForPathname(pathname: string, targetLocale: Locale): string {
  const page = pageFromPathname(pathname) ?? "home";
  return pathFor(targetLocale, page);
}
