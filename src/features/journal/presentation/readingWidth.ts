import { useCallback, useEffect, useState } from "react";

// The Memórias reading view (JournalPublicationView) used to hardcode its width
// to 44rem with no way to change it, which wastes most of the canvas on wide
// monitors. This is the persisted preference behind a small width control.
//
// A maximum reading measure is still good typography (≈45–75 chars/line), so we
// offer presets instead of removing the limit. "full" trades line length for
// using the whole canvas, for people who prefer it.

export type ReadingWidth = "narrow" | "comfortable" | "wide" | "full";

export const READING_WIDTHS: ReadingWidth[] = ["narrow", "comfortable", "wide", "full"];

/** Target max-width per preset. `full` uses the whole column (minus padding). */
const READING_WIDTH_VALUE: Record<ReadingWidth, string> = {
  narrow: "38rem",
  comfortable: "44rem",
  wide: "58rem",
  full: "100%",
};

/**
 * Resolve a preset to a CSS max-width. Non-full presets are clamped with `min`
 * so the article never touches the panel edges on narrow canvases (it tracks
 * the available width instead of overflowing or hugging the borders).
 */
export function readingWidthCss(width: ReadingWidth): string {
  const value = READING_WIDTH_VALUE[width];
  return value === "100%" ? "100%" : `min(${value}, 92%)`;
}

const STORAGE_KEY = "mark-lee-journal-reading-width";
const DEFAULT_WIDTH: ReadingWidth = "comfortable";

function isReadingWidth(value: unknown): value is ReadingWidth {
  return typeof value === "string" && (READING_WIDTHS as string[]).includes(value);
}

function loadReadingWidth(): ReadingWidth {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isReadingWidth(stored)) return stored;
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return DEFAULT_WIDTH;
}

/** Reading-width preference, persisted globally in localStorage. */
export function useReadingWidth(): [ReadingWidth, (next: ReadingWidth) => void] {
  const [width, setWidth] = useState<ReadingWidth>(loadReadingWidth);

  // Keep multiple open reading views (and other tabs) in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isReadingWidth(e.newValue)) setWidth(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: ReadingWidth) => {
    setWidth(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failure — preference still applies this session */
    }
  }, []);

  return [width, update];
}
