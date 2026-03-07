import {
  PublicationElementStyles,
  PublicationPreset,
  PublicationShadow,
  PublicationTracking,
} from "../types";

type LegacyPublicationPreset = {
  id?: string;
  name?: string;
  description?: string;
  palette?: {
    bg?: string;
    text?: string;
    accent?: string;
    muted?: string;
  };
  typography?: {
    fontFamily?: string;
    lineHeight?: number;
  };
};

const trackingValues: Record<PublicationTracking, number> = {
  tight: -0.02,
  normal: 0,
  wide: 0.05,
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (![3, 6].includes(normalized.length)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const intValue = Number.parseInt(expanded, 16);
  if (Number.isNaN(intValue)) return null;
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function rgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, transparent)`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  if (l1 == null || l2 == null) return 0;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureAccessibleColor(foreground: string, background: string, minimumContrast: number) {
  if (contrastRatio(foreground, background) >= minimumContrast) return foreground;
  const fgLum = luminance(foreground);
  const bgLum = luminance(background);
  if (fgLum == null || bgLum == null) return foreground;
  return bgLum > 0.5 ? "#111827" : "#f8fafc";
}

function shadowToCss(shadow: PublicationShadow, textColor: string) {
  switch (shadow) {
    case "none":
      return "none";
    case "soft":
      return `0 10px 22px ${rgba(textColor, 0.12)}`;
    case "lifted":
      return `0 18px 32px ${rgba(textColor, 0.16)}, 0 2px 8px ${rgba(textColor, 0.08)}`;
    case "editorial":
      return `0 14px 28px ${rgba(textColor, 0.14)}, inset 0 1px 0 rgba(255,255,255,0.22)`;
    default:
      return `0 10px 22px ${rgba(textColor, 0.12)}`;
  }
}

function createElements(): PublicationElementStyles {
  return {
    h1: {
      size: 44,
      weight: 800,
      lineHeight: 1.04,
      letterSpacing: -0.03,
      marginTop: 12,
      marginBottom: 20,
      tone: "text",
    },
    h2: {
      size: 32,
      weight: 760,
      lineHeight: 1.1,
      letterSpacing: -0.02,
      marginTop: 28,
      marginBottom: 14,
      tone: "text",
    },
    h3: {
      size: 24,
      weight: 700,
      lineHeight: 1.18,
      letterSpacing: -0.01,
      marginTop: 22,
      marginBottom: 12,
      tone: "accent",
    },
    p: {
      size: 18,
      weight: 420,
      lineHeight: 1.72,
      marginBottom: 14,
      tone: "text",
    },
    list: {
      size: 17,
      weight: 430,
      lineHeight: 1.66,
      itemGap: 8,
      indent: 28,
      markerTone: "accent",
    },
    blockquote: {
      paddingX: 18,
      paddingY: 14,
      radius: 18,
      borderWidth: 4,
      tone: "accent",
      useBackground: true,
      italic: true,
    },
    codeInline: {
      fontSize: 15,
      paddingX: 7,
      paddingY: 3,
      radius: 8,
      useBackground: true,
      useBorder: false,
    },
    codeBlock: {
      fontSize: 15,
      padding: 18,
      radius: 18,
      useBackground: true,
      useBorder: true,
    },
    link: {
      weight: 650,
      underline: "strong",
    },
    hr: {
      thickness: 1,
      opacity: 0.25,
      margin: 24,
    },
    table: {
      headerWeight: 700,
      cellPaddingX: 14,
      cellPaddingY: 10,
      radius: 14,
      striped: false,
      dense: false,
      useBorder: true,
      captionTone: "muted",
    },
    image: {
      radius: 18,
      margin: 22,
      useBorder: false,
      shadow: "soft",
    },
    frontmatterCard: {
      padding: 18,
      radius: 18,
      useBorder: true,
      useBackground: true,
      titleWeight: 700,
    },
  };
}

export function createPublicationPreset(
  id: string,
  name: string,
  description: string,
  colors: { bg: string; text: string; accent: string; muted: string; border?: string },
  typography?: Partial<PublicationPreset["typography"]>,
  elements?: Partial<PublicationElementStyles>,
  spacing?: Partial<PublicationPreset["spacing"]>
): PublicationPreset {
  const surfaceText = ensureAccessibleColor(colors.text, colors.bg, 4.5);
  const surfaceAccent = ensureAccessibleColor(colors.accent, colors.bg, 4.5);
  const defaultElements = createElements();

  return {
    id,
    name,
    description,
    surface: {
      bg: colors.bg,
      text: surfaceText,
      accent: surfaceAccent,
      muted: colors.muted,
      border: colors.border ?? rgba(surfaceText, 0.16),
      radius: 20,
      shadow: "editorial",
    },
    typography: {
      fontFamily: "'Source Sans 3', 'Segoe UI', sans-serif",
      lineHeight: 1.7,
      bodySize: 18,
      bodyWeight: 420,
      headingWeight: 760,
      tracking: "normal",
      ...typography,
    },
    spacing: {
      pagePadding: 34,
      columnWidth: 860,
      blockGap: 22,
      paragraphGap: 14,
      listGap: 10,
      tableCellPaddingX: 14,
      tableCellPaddingY: 10,
      ...spacing,
    },
    elements: {
      ...defaultElements,
      ...elements,
    },
  };
}

export function migratePublicationPreset(raw: PublicationPreset | LegacyPublicationPreset): PublicationPreset {
  if ((raw as PublicationPreset).surface && (raw as PublicationPreset).spacing && (raw as PublicationPreset).elements) {
    const preset = raw as PublicationPreset;
    return {
      ...preset,
      surface: {
        ...preset.surface,
        text: ensureAccessibleColor(preset.surface.text, preset.surface.bg, 4.5),
        accent: ensureAccessibleColor(preset.surface.accent, preset.surface.bg, 4.5),
        border: preset.surface.border || rgba(preset.surface.text, 0.16),
        radius: preset.surface.radius ?? 20,
        shadow: preset.surface.shadow ?? "editorial",
      },
    };
  }

  const legacy = raw as LegacyPublicationPreset;
  const bg = legacy.palette?.bg || "#f8fafc";
  const text = legacy.palette?.text || "#111827";
  const accent = legacy.palette?.accent || "#172554";
  const muted = legacy.palette?.muted || "#475569";

  return createPublicationPreset(
    legacy.id || crypto.randomUUID(),
    legacy.name || "Custom preset",
    legacy.description || "Migrated publication preset",
    { bg, text, accent, muted },
    {
      fontFamily: legacy.typography?.fontFamily || "'Source Sans 3', 'Segoe UI', sans-serif",
      lineHeight: legacy.typography?.lineHeight || 1.7,
    }
  );
}

export function getPublicationStyleObject(preset: PublicationPreset) {
  const text = ensureAccessibleColor(preset.surface.text, preset.surface.bg, 4.5);
  const accent = ensureAccessibleColor(preset.surface.accent, preset.surface.bg, 4.5);
  const muted = ensureAccessibleColor(preset.surface.muted, preset.surface.bg, 3.2);
  const border = preset.surface.border || rgba(text, 0.16);
  const h1 = preset.elements.h1;
  const h2 = preset.elements.h2;
  const h3 = preset.elements.h3;
  const body = preset.elements.p;
  const list = preset.elements.list;
  const blockquote = preset.elements.blockquote;
  const codeInline = preset.elements.codeInline;
  const codeBlock = preset.elements.codeBlock;
  const link = preset.elements.link;
  const hr = preset.elements.hr;
  const table = preset.elements.table;
  const image = preset.elements.image;
  const frontmatter = preset.elements.frontmatterCard;

  return {
    backgroundColor: preset.surface.bg,
    color: text,
    fontFamily: preset.typography.fontFamily,
    lineHeight: String(preset.typography.lineHeight),
    "--ml-preview-bg": preset.surface.bg,
    "--ml-preview-text": text,
    "--ml-preview-accent": accent,
    "--ml-preview-muted": muted,
    "--ml-preview-border": border,
    "--ml-preview-radius": `${preset.surface.radius}px`,
    "--ml-preview-shadow": shadowToCss(preset.surface.shadow, text),
    "--ml-preview-page-padding": `${preset.spacing.pagePadding}px`,
    "--ml-preview-column-width": `${preset.spacing.columnWidth}px`,
    "--ml-preview-block-gap": `${preset.spacing.blockGap}px`,
    "--ml-preview-paragraph-gap": `${preset.spacing.paragraphGap}px`,
    "--ml-preview-list-gap": `${preset.spacing.listGap}px`,
    "--ml-preview-table-pad-x": `${table.dense ? Math.max(8, table.cellPaddingX - 4) : table.cellPaddingX}px`,
    "--ml-preview-table-pad-y": `${table.dense ? Math.max(6, table.cellPaddingY - 3) : table.cellPaddingY}px`,
    "--ml-preview-body-size": `${preset.typography.bodySize}px`,
    "--ml-preview-body-weight": String(preset.typography.bodyWeight),
    "--ml-preview-heading-weight": String(preset.typography.headingWeight),
    "--ml-preview-tracking": `${trackingValues[preset.typography.tracking]}em`,
    "--ml-preview-h1-size": `${h1.size}px`,
    "--ml-preview-h1-weight": String(h1.weight),
    "--ml-preview-h1-line-height": String(h1.lineHeight),
    "--ml-preview-h1-tracking": `${h1.letterSpacing}em`,
    "--ml-preview-h1-margin-top": `${h1.marginTop}px`,
    "--ml-preview-h1-margin-bottom": `${h1.marginBottom}px`,
    "--ml-preview-h1-tone": h1.tone === "accent" ? accent : h1.tone === "muted" ? muted : text,
    "--ml-preview-h1-style": h1.italic ? "italic" : "normal",
    "--ml-preview-h1-transform": h1.uppercase ? "uppercase" : "none",
    "--ml-preview-h2-size": `${h2.size}px`,
    "--ml-preview-h2-weight": String(h2.weight),
    "--ml-preview-h2-line-height": String(h2.lineHeight),
    "--ml-preview-h2-tracking": `${h2.letterSpacing}em`,
    "--ml-preview-h2-margin-top": `${h2.marginTop}px`,
    "--ml-preview-h2-margin-bottom": `${h2.marginBottom}px`,
    "--ml-preview-h2-tone": h2.tone === "accent" ? accent : h2.tone === "muted" ? muted : text,
    "--ml-preview-h2-style": h2.italic ? "italic" : "normal",
    "--ml-preview-h2-transform": h2.uppercase ? "uppercase" : "none",
    "--ml-preview-h3-size": `${h3.size}px`,
    "--ml-preview-h3-weight": String(h3.weight),
    "--ml-preview-h3-line-height": String(h3.lineHeight),
    "--ml-preview-h3-tracking": `${h3.letterSpacing}em`,
    "--ml-preview-h3-margin-top": `${h3.marginTop}px`,
    "--ml-preview-h3-margin-bottom": `${h3.marginBottom}px`,
    "--ml-preview-h3-tone": h3.tone === "accent" ? accent : h3.tone === "muted" ? muted : text,
    "--ml-preview-h3-style": h3.italic ? "italic" : "normal",
    "--ml-preview-h3-transform": h3.uppercase ? "uppercase" : "none",
    "--ml-preview-p-size": `${body.size}px`,
    "--ml-preview-p-weight": String(body.weight),
    "--ml-preview-p-line-height": String(body.lineHeight),
    "--ml-preview-p-margin-bottom": `${body.marginBottom}px`,
    "--ml-preview-p-tone": body.tone === "muted" ? muted : text,
    "--ml-preview-list-size": `${list.size}px`,
    "--ml-preview-list-weight": String(list.weight),
    "--ml-preview-list-line-height": String(list.lineHeight),
    "--ml-preview-list-item-gap": `${list.itemGap}px`,
    "--ml-preview-list-indent": `${list.indent}px`,
    "--ml-preview-list-marker": list.markerTone === "accent" ? accent : list.markerTone === "muted" ? muted : text,
    "--ml-preview-quote-pad-x": `${blockquote.paddingX}px`,
    "--ml-preview-quote-pad-y": `${blockquote.paddingY}px`,
    "--ml-preview-quote-radius": `${blockquote.radius}px`,
    "--ml-preview-quote-border": `${blockquote.borderWidth}px`,
    "--ml-preview-quote-tone": blockquote.tone === "muted" ? muted : accent,
    "--ml-preview-quote-bg": blockquote.useBackground ? rgba(accent, 0.08) : "transparent",
    "--ml-preview-inline-code-size": `${codeInline.fontSize}px`,
    "--ml-preview-inline-code-pad-x": `${codeInline.paddingX}px`,
    "--ml-preview-inline-code-pad-y": `${codeInline.paddingY}px`,
    "--ml-preview-inline-code-radius": `${codeInline.radius}px`,
    "--ml-preview-inline-code-bg": codeInline.useBackground ? rgba(text, 0.08) : "transparent",
    "--ml-preview-inline-code-border": codeInline.useBorder ? `1px solid ${rgba(text, 0.18)}` : "none",
    "--ml-preview-code-size": `${codeBlock.fontSize}px`,
    "--ml-preview-code-padding": `${codeBlock.padding}px`,
    "--ml-preview-code-radius": `${codeBlock.radius}px`,
    "--ml-preview-code-bg": codeBlock.useBackground ? rgba(text, 0.06) : "transparent",
    "--ml-preview-code-border": codeBlock.useBorder ? `1px solid ${rgba(text, 0.18)}` : "none",
    "--ml-preview-link-weight": String(link.weight),
    "--ml-preview-link-decoration":
      link.underline === "none" ? "none" : `underline ${link.underline === "strong" ? "2px" : "1px"}`,
    "--ml-preview-rule-thickness": `${hr.thickness}px`,
    "--ml-preview-rule-opacity": String(hr.opacity),
    "--ml-preview-rule-margin": `${hr.margin}px`,
    "--ml-preview-table-header-weight": String(table.headerWeight),
    "--ml-preview-table-radius": `${table.radius}px`,
    "--ml-preview-table-border": table.useBorder ? `1px solid ${rgba(text, 0.16)}` : "none",
    "--ml-preview-table-caption-tone": table.captionTone === "accent" ? accent : muted,
    "--ml-preview-table-stripe": table.striped ? rgba(text, 0.035) : "transparent",
    "--ml-preview-image-radius": `${image.radius}px`,
    "--ml-preview-image-margin": `${image.margin}px`,
    "--ml-preview-image-border": image.useBorder ? `1px solid ${rgba(text, 0.16)}` : "none",
    "--ml-preview-image-shadow": shadowToCss(image.shadow, text),
    "--ml-preview-frontmatter-padding": `${frontmatter.padding}px`,
    "--ml-preview-frontmatter-radius": `${frontmatter.radius}px`,
    "--ml-preview-frontmatter-border": frontmatter.useBorder ? `1px solid ${rgba(text, 0.18)}` : "none",
    "--ml-preview-frontmatter-bg": frontmatter.useBackground ? rgba(text, 0.05) : "transparent",
    "--ml-preview-frontmatter-title-weight": String(frontmatter.titleWeight),
  } as Record<string, string>;
}

export function styleObjectToInlineCss(style: Record<string, string | number | undefined>) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const cssKey = key.startsWith("--")
        ? key
        : key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      return `${cssKey}:${value}`;
    })
    .join(";");
}

export const publicationExportBaseCss = `
.ml-preview-surface{min-height:100%;border:1px solid var(--ml-preview-border);border-radius:var(--ml-preview-radius);padding:var(--ml-preview-page-padding);overflow:hidden;box-shadow:var(--ml-preview-shadow);}
.ml-preview-prose{max-width:min(100%,var(--ml-preview-column-width));margin:0 auto;color:var(--ml-preview-text);font-size:var(--ml-preview-body-size);line-height:var(--ml-preview-p-line-height);font-weight:var(--ml-preview-body-weight);letter-spacing:var(--ml-preview-tracking);overflow-wrap:anywhere;word-break:break-word;}
.ml-preview-prose>*:first-child{margin-top:0!important;}
.ml-preview-prose h1,.ml-preview-prose h2,.ml-preview-prose h3{font-family:inherit;color:inherit;}
.ml-preview-prose h1{font-size:var(--ml-preview-h1-size);font-weight:var(--ml-preview-h1-weight);line-height:var(--ml-preview-h1-line-height);letter-spacing:var(--ml-preview-h1-tracking);margin:var(--ml-preview-h1-margin-top) 0 var(--ml-preview-h1-margin-bottom);color:var(--ml-preview-h1-tone);font-style:var(--ml-preview-h1-style);text-transform:var(--ml-preview-h1-transform);}
.ml-preview-prose h2{font-size:var(--ml-preview-h2-size);font-weight:var(--ml-preview-h2-weight);line-height:var(--ml-preview-h2-line-height);letter-spacing:var(--ml-preview-h2-tracking);margin:var(--ml-preview-h2-margin-top) 0 var(--ml-preview-h2-margin-bottom);color:var(--ml-preview-h2-tone);font-style:var(--ml-preview-h2-style);text-transform:var(--ml-preview-h2-transform);}
.ml-preview-prose h3{font-size:var(--ml-preview-h3-size);font-weight:var(--ml-preview-h3-weight);line-height:var(--ml-preview-h3-line-height);letter-spacing:var(--ml-preview-h3-tracking);margin:var(--ml-preview-h3-margin-top) 0 var(--ml-preview-h3-margin-bottom);color:var(--ml-preview-h3-tone);font-style:var(--ml-preview-h3-style);text-transform:var(--ml-preview-h3-transform);}
.ml-preview-prose p{margin:0 0 var(--ml-preview-p-margin-bottom);font-size:var(--ml-preview-p-size);font-weight:var(--ml-preview-p-weight);line-height:var(--ml-preview-p-line-height);color:var(--ml-preview-p-tone);}
.ml-preview-prose ul,.ml-preview-prose ol{padding-left:var(--ml-preview-list-indent);font-size:var(--ml-preview-list-size);font-weight:var(--ml-preview-list-weight);line-height:var(--ml-preview-list-line-height);margin:0 0 var(--ml-preview-block-gap);}
.ml-preview-prose li+li{margin-top:var(--ml-preview-list-item-gap);}
.ml-preview-prose li::marker{color:var(--ml-preview-list-marker);}
.ml-preview-prose a{color:var(--ml-preview-accent);font-weight:var(--ml-preview-link-weight);text-decoration:var(--ml-preview-link-decoration);text-underline-offset:0.18em;}
.ml-preview-prose blockquote{margin:0 0 var(--ml-preview-block-gap);padding:var(--ml-preview-quote-pad-y) var(--ml-preview-quote-pad-x);border-left:var(--ml-preview-quote-border) solid var(--ml-preview-quote-tone);border-radius:var(--ml-preview-quote-radius);background:var(--ml-preview-quote-bg);}
.ml-preview-prose hr{margin:var(--ml-preview-rule-margin) 0;border:none;border-top:var(--ml-preview-rule-thickness) solid var(--ml-preview-border);opacity:var(--ml-preview-rule-opacity);}
.ml-preview-prose pre{margin:0 0 var(--ml-preview-block-gap);padding:var(--ml-preview-code-padding);font-size:var(--ml-preview-code-size);white-space:pre-wrap;overflow:auto;border-radius:var(--ml-preview-code-radius);background:var(--ml-preview-code-bg);border:var(--ml-preview-code-border);}
.ml-preview-prose code{font-size:var(--ml-preview-inline-code-size);}
.ml-preview-prose :not(pre)>code{padding:var(--ml-preview-inline-code-pad-y) var(--ml-preview-inline-code-pad-x);border-radius:var(--ml-preview-inline-code-radius);background:var(--ml-preview-inline-code-bg);border:var(--ml-preview-inline-code-border);}
.ml-preview-prose table{width:100%;border-collapse:separate;border-spacing:0;display:block;overflow-x:auto;margin:0 0 var(--ml-preview-block-gap);border:var(--ml-preview-table-border);border-radius:var(--ml-preview-table-radius);}
.ml-preview-prose thead th{font-weight:var(--ml-preview-table-header-weight);}
.ml-preview-prose th,.ml-preview-prose td{padding:var(--ml-preview-table-pad-y) var(--ml-preview-table-pad-x);border-bottom:1px solid var(--ml-preview-border);text-align:left;}
.ml-preview-prose tbody tr:nth-child(even){background:var(--ml-preview-table-stripe);}
.ml-preview-prose img{display:block;max-width:100%;height:auto;margin:0 auto var(--ml-preview-image-margin);border-radius:var(--ml-preview-image-radius);border:var(--ml-preview-image-border);box-shadow:var(--ml-preview-image-shadow);}
.ml-frontmatter-card{margin-bottom:var(--ml-preview-block-gap);padding:var(--ml-preview-frontmatter-padding);border-radius:var(--ml-preview-frontmatter-radius);border:var(--ml-preview-frontmatter-border);background:var(--ml-preview-frontmatter-bg);}
.ml-frontmatter-card .ml-frontmatter-title{font-weight:var(--ml-preview-frontmatter-title-weight);color:var(--ml-preview-muted);text-transform:uppercase;letter-spacing:.14em;font-size:11px;}
`;
