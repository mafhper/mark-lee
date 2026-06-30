import { Locale, ProductVisual } from "@/i18n";

export type ProductVisualKey =
  | "editor"
  | "memoriesReading"
  | "memoriesReadingDark"
  | "memoriesExplore"
  | "memoriesPlaces";

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
    focalPoint: "50% 50%",
    capturedAt: "2026-06-30",
    appVersion: "1.3.3",
  },
  memoriesReading: {
    source: asset("memories-reading.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Memórias no Mark-Lee em modo de leitura, com caderno e registro abertos em tema claro.",
      "en-US": "Mark-Lee Memories in reading mode, with a notebook and entry open in a light theme.",
      "es-ES": "Memorias de Mark-Lee en modo de lectura, con un cuaderno y registro abiertos en tema claro.",
    },
    focalPoint: "50% 50%",
    capturedAt: "2026-06-30",
    appVersion: "1.3.3",
  },
  memoriesReadingDark: {
    source: asset("memories-reading-dark.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Memórias no Mark-Lee lendo um registro com foto em tema escuro.",
      "en-US": "Mark-Lee Memories reading an entry with a photo in a dark theme.",
      "es-ES": "Memorias de Mark-Lee leyendo un registro con foto en tema oscuro.",
    },
    focalPoint: "50% 50%",
    capturedAt: "2026-06-30",
    appVersion: "1.3.3",
  },
  memoriesExplore: {
    source: asset("memories-explore.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Galeria de Memórias no Mark-Lee com fotos organizadas por registro.",
      "en-US": "Mark-Lee Memories gallery with photos organized by entry.",
      "es-ES": "Galería de Memorias de Mark-Lee con fotos organizadas por registro.",
    },
    focalPoint: "50% 50%",
    capturedAt: "2026-06-30",
    appVersion: "1.3.3",
  },
  memoriesPlaces: {
    source: asset("memories-places.png"),
    width: 1600,
    height: 1000,
    alt: {
      "pt-BR": "Mapa de Lugares no Mark-Lee com registros marcados por localização.",
      "en-US": "Mark-Lee Places map with entries pinned by location.",
      "es-ES": "Mapa de Lugares de Mark-Lee con registros marcados por ubicación.",
    },
    focalPoint: "50% 50%",
    capturedAt: "2026-06-30",
    appVersion: "1.3.3",
  },
};

export function productVisual(key: ProductVisualKey, locale: Locale) {
  const visual = PRODUCT_VISUALS[key];
  return { ...visual, localizedAlt: visual.alt[locale] };
}
