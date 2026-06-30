import { Locale, ProductVisual } from "@/i18n";

export type ProductVisualKey = "editor" | "memoriesReading" | "memoriesExplore";

const asset = (fileName: string) => `${import.meta.env.BASE_URL}assets/product/${fileName}`;

export const PRODUCT_VISUALS: Record<ProductVisualKey, ProductVisual> = {
  editor: {
    source: asset("editor.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Editor do Mark-Lee com árvore de arquivos, Markdown e preview lado a lado.",
      "en-US": "Mark-Lee Editor with a file tree, Markdown, and side-by-side preview.",
      "es-ES": "Editor de Mark-Lee con árbol de archivos, Markdown y vista previa lado a lado.",
    },
    focalPoint: "50% 48%",
    capturedAt: "2026-06-29",
    appVersion: "1.3.3",
  },
  memoriesReading: {
    source: asset("memories-reading.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Memórias no Mark-Lee em modo de leitura editorial, com caderno e registro abertos.",
      "en-US": "Mark-Lee Memories in editorial reading mode with an open notebook and entry.",
      "es-ES": "Memorias de Mark-Lee en modo de lectura editorial, con un cuaderno y registro abiertos.",
    },
    focalPoint: "58% 50%",
    capturedAt: "2026-06-29",
    appVersion: "1.3.3",
  },
  memoriesExplore: {
    source: asset("memories-explore.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Exploração de Memórias no Mark-Lee com calendário, galeria, lugares e Pins.",
      "en-US": "Mark-Lee Memories exploration with calendar, gallery, places, and Pins.",
      "es-ES": "Exploración de Memorias en Mark-Lee con calendario, galería, lugares y Pins.",
    },
    focalPoint: "50% 50%",
    capturedAt: "2026-06-29",
    appVersion: "1.3.3",
  },
};

export function productVisual(key: ProductVisualKey, locale: Locale) {
  const visual = PRODUCT_VISUALS[key];
  return { ...visual, localizedAlt: visual.alt[locale] };
}
