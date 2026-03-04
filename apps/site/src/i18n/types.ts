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
    title: string;
    description: string;
  };
  statsSection: {
    label: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    cards: Array<{ value: string; label: string }>;
  };
  capabilitiesSection: {
    label: string;
    title: string;
    description: string;
    items: Array<{
      label: string;
      title: string;
      description: string;
      highlights?: string[];
    }>;
  };
  ctaSection: CtaCopy;
}

export type GalleryPreviewVisual = "preview" | "focus" | "workspace" | "snippets";

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
  nav: Record<Exclude<PageKey, "downloads">, string>;
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
